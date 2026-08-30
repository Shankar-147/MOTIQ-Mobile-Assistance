import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PresenceStatus as PrismaPresenceStatus,
  ProviderVerificationStatus as PrismaVerificationStatus,
  TrustSnapshotReason as PrismaTrustSnapshotReason,
  VerificationDocumentStatus as PrismaDocumentStatus,
} from "@prisma/client";
import {
  PresenceStatus,
  ProviderVerificationStatus,
  TrustSnapshotReason,
  VerificationDocumentType,
} from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  assertValidVerificationTransition,
  isEligibleForMatching,
} from "./provider-verification-state-machine";
import { calculateTrustScore } from "./trust-score.util";
import { decryptField, encryptField } from "../../common/encryption.util";

interface NearbyProviderRow {
  id: string;
  distanceMeters: number;
  /// Ch84's ranking input, added Phase 6 — see ai/provider-ranking.util.ts.
  trustScore: number;
}

const DEFAULT_PROVISIONAL_REVERIFICATION_DAYS = 30;
const DEFAULT_FULLY_VERIFIED_REVERIFICATION_DAYS = 180;

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findById(id: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`ProviderProfile ${id} not found`);
    }
    return provider;
  }

  /** Ch137's Admin Console needs a way to browse providers (to find one to
   * change a verification tier for, outside the pending-documents queue).
   * Cursor-based, per docs/api-conventions.md's pagination convention. */
  async listAll(params: { serviceAreaId?: string; cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const providers = await this.prisma.providerProfile.findMany({
      where: params.serviceAreaId ? { serviceAreaId: params.serviceAreaId } : undefined,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: { user: { select: { phone: true } } },
    });

    const hasMore = providers.length > limit;
    const page = hasMore ? providers.slice(0, limit) : providers;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  /** Ch71's mobile Customer app tracking screen — a small, deliberately
   * non-sensitive slice of a provider's profile (no phone, no exact
   * location) so a customer can see who's coming without either side
   * reaching into the other's full profile. */
  async findPublicById(id: string) {
    const provider = await this.findById(id);
    return {
      id: provider.id,
      businessName: provider.businessName,
      ratingAverage: provider.ratingAverage,
      verificationStatus: provider.verificationStatus,
    };
  }

  /** Ch72's mobile Provider app job-history screen — every Assignment this
   * provider was ever offered, whatever the outcome, newest first. Cursor-
   * based, per docs/api-conventions.md's pagination convention. */
  async listOwnJobs(providerProfileId: string, params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const jobs = await this.prisma.assignment.findMany({
      where: { providerProfileId },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { offeredAt: "desc" },
      include: {
        serviceRequest: {
          select: { id: true, issueType: true, status: true, createdAt: true },
        },
      },
    });

    const hasMore = jobs.length > limit;
    const page = hasMore ? jobs.slice(0, limit) : jobs;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  /**
   * A provider going online/offline and updating their live location — the
   * write side of the Ch39 geospatial index MatchingService reads from.
   * currentLocation is a PostGIS Unsupported column (ADR 0002), set via raw
   * SQL like ServiceRequest.pickupLocation.
   */
  async setPresence(
    providerProfileId: string,
    presenceStatus: PresenceStatus,
    location?: { latitude: number; longitude: number },
  ) {
    await this.findById(providerProfileId);
    await this.prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: {
        presenceStatus: presenceStatus as unknown as PrismaPresenceStatus,
        lastSeenAt: new Date(),
      },
    });

    if (location) {
      await this.prisma.$executeRaw`
        UPDATE provider_profiles
        SET "currentLocation" = ST_SetSRID(
          ST_MakePoint(${location.longitude}, ${location.latitude}),
          4326
        )::geography
        WHERE id = ${providerProfileId}
      `;
    }

    return this.findById(providerProfileId);
  }

  /**
   * The nearest-provider query Ch39 requires to go through PostGIS, not
   * application-side filtering. Kept for callers that already have a raw
   * origin point; MatchingService uses findNearestAvailableProvidersForRequest
   * below instead, since it can join directly against the request's own
   * pickupLocation column without extracting coordinates into application code.
   */
  async findNearestAvailableProviders(
    serviceAreaId: string,
    origin: { latitude: number; longitude: number },
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyProviderRow[]> {
    return this.prisma.$queryRaw<NearbyProviderRow[]>`
      SELECT id, ST_Distance(
        "currentLocation",
        ST_SetSRID(ST_MakePoint(${origin.longitude}, ${origin.latitude}), 4326)::geography
      ) AS "distanceMeters", "trustScore"::float8 AS "trustScore"
      FROM provider_profiles
      WHERE "serviceAreaId" = ${serviceAreaId}
        AND "presenceStatus" = 'ONLINE'
        AND "verificationStatus" IN ('PROVISIONAL', 'FULLY_VERIFIED')
        AND "currentLocation" IS NOT NULL
        AND ST_DWithin(
          "currentLocation",
          ST_SetSRID(ST_MakePoint(${origin.longitude}, ${origin.latitude}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit}
    `;
  }

  /**
   * Ch53's candidate retrieval, joined directly against a ServiceRequest's
   * own pickupLocation. Returns candidates in distance order — MatchingService
   * re-ranks this set via ProviderRankingPort (Ch84, Phase 6), falling back to
   * this exact distance-sort order if ranking is unavailable (ADR 0007/Ch35's
   * non-negotiable fallback). Excludes any provider already offered this
   * request (any outcome — offered, accepted, rejected, or timed out), so a
   * reassignment retry never re-asks someone who already answered.
   */
  async findNearestAvailableProvidersForRequest(
    serviceRequestId: string,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyProviderRow[]> {
    return this.prisma.$queryRaw<NearbyProviderRow[]>`
      SELECT pp.id, ST_Distance(pp."currentLocation", sr."pickupLocation") AS "distanceMeters",
        pp."trustScore"::float8 AS "trustScore"
      FROM provider_profiles pp
      JOIN service_requests sr ON sr.id = ${serviceRequestId}
      WHERE pp."serviceAreaId" = sr."serviceAreaId"
        AND pp."presenceStatus" = 'ONLINE'
        AND pp."verificationStatus" IN ('PROVISIONAL', 'FULLY_VERIFIED')
        AND pp."currentLocation" IS NOT NULL
        AND sr."pickupLocation" IS NOT NULL
        AND ST_DWithin(pp."currentLocation", sr."pickupLocation", ${radiusMeters})
        AND NOT EXISTS (
          SELECT 1 FROM assignments a
          WHERE a."serviceRequestId" = sr.id AND a."providerProfileId" = pp.id
        )
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit}
    `;
  }

  /**
   * Ch54's ETA recomputation input: current provider-to-pickup distance,
   * recomputed on every accepted location update. Returns null if either
   * point is unavailable (provider went offline mid-job, e.g.) rather than
   * throwing — a missing ETA is a normal, expected transient state on a live
   * tracking feed, not an error.
   */
  /** Ch32's routing feature needs the provider's actual coordinates (not
   * just a distance) to ask a routing engine for a real road path — mirrors
   * RequestService.getPickupLocation()'s same PostGIS-Unsupported-column
   * read-back pattern. Null if the provider has never reported a location. */
  async getCurrentLocation(providerProfileId: string): Promise<{ latitude: number; longitude: number } | null> {
    const rows = await this.prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y("currentLocation"::geometry) AS latitude, ST_X("currentLocation"::geometry) AS longitude
      FROM provider_profiles
      WHERE id = ${providerProfileId} AND "currentLocation" IS NOT NULL
    `;
    return rows[0] ?? null;
  }

  async getDistanceToServiceRequestPickup(
    providerProfileId: string,
    serviceRequestId: string,
  ): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ distanceMeters: number | null }[]>`
      SELECT ST_Distance(pp."currentLocation", sr."pickupLocation") AS "distanceMeters"
      FROM provider_profiles pp, service_requests sr
      WHERE pp.id = ${providerProfileId} AND sr.id = ${serviceRequestId}
    `;
    return rows[0]?.distanceMeters ?? null;
  }

  /** Ch98 — a provider self-submits KYC documents; fileUrl is a client-
   * supplied reference (no real storage/scanning integration — see ADR 0016).
   * Encrypted at rest as of Phase 7 (Ch94, ADR 0020) — the most sensitive
   * currently-stored field with no functional need to be plaintext-searchable. */
  async submitVerificationDocument(
    providerProfileId: string,
    documentType: VerificationDocumentType,
    fileUrl: string,
  ) {
    await this.findById(providerProfileId);
    const document = await this.prisma.providerVerificationDocument.create({
      data: { providerProfileId, documentType, fileUrl: this.encryptFileUrl(fileUrl) },
    });
    return { ...document, fileUrl };
  }

  async listOwnVerificationDocuments(providerProfileId: string) {
    const documents = await this.prisma.providerVerificationDocument.findMany({
      where: { providerProfileId },
      orderBy: { submittedAt: "desc" },
    });
    return documents.map((document) => ({ ...document, fileUrl: this.decryptFileUrl(document.fileUrl) }));
  }

  /** Ch61's provider-verification workflow backend reads through this — see AdminService. */
  async listPendingVerificationDocuments() {
    const documents = await this.prisma.providerVerificationDocument.findMany({
      where: { status: PrismaDocumentStatus.PENDING },
      orderBy: { submittedAt: "asc" },
    });
    return documents.map((document) => ({ ...document, fileUrl: this.decryptFileUrl(document.fileUrl) }));
  }

  /** The trust-score ML training-data export — see recomputeTrustScore()'s
   * doc comment. Cursor-paginated, same convention as every other list
   * endpoint (docs/api-conventions.md). */
  async listTrustSnapshots(params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const snapshots = await this.prisma.providerTrustSnapshot.findMany({
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = snapshots.length > limit;
    const page = hasMore ? snapshots.slice(0, limit) : snapshots;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  private encryptFileUrl(fileUrl: string): string {
    return encryptField(fileUrl, this.config.get<string>("ENCRYPTION_MASTER_KEY"));
  }

  private decryptFileUrl(ciphertext: string): string {
    return decryptField(ciphertext, this.config.get<string>("ENCRYPTION_MASTER_KEY"));
  }

  /**
   * Marks one document approved/rejected. Deliberately does NOT itself
   * change ProviderProfile.verificationStatus — the Bible hasn't specified
   * "N documents of type X" rules, and inventing one would be exactly the
   * kind of silently-assumed business rule CLAUDE.md's binding-constraint
   * discipline warns against. An admin separately calls
   * transitionVerificationStatus() once they judge enough has been reviewed.
   */
  async reviewVerificationDocument(
    documentId: string,
    reviewedByUserId: string,
    decision: "APPROVED" | "REJECTED",
    notes?: string,
  ) {
    const document = await this.prisma.providerVerificationDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`ProviderVerificationDocument ${documentId} not found`);
    }
    if (document.status !== PrismaDocumentStatus.PENDING) {
      throw new BadRequestException(
        `ProviderVerificationDocument ${documentId} has already been reviewed (status: ${document.status}).`,
      );
    }

    const updated = await this.prisma.providerVerificationDocument.update({
      where: { id: documentId },
      data: {
        status: decision as unknown as PrismaDocumentStatus,
        reviewedByUserId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });
    return { ...updated, fileUrl: this.decryptFileUrl(updated.fileUrl) };
  }

  /**
   * The ONLY method permitted to change ProviderProfile.verificationStatus
   * (Ch98, ADR 0016) — mirrors RequestService.transition()'s discipline.
   * Bumps lastVerifiedAt when the transition grants a working tier
   * (PROVISIONAL/FULLY_VERIFIED), starting the re-verification clock, and
   * always recomputes trustScore, since the verification multiplier depends on it.
   */
  async transitionVerificationStatus(providerProfileId: string, to: ProviderVerificationStatus) {
    const provider = await this.findById(providerProfileId);
    assertValidVerificationTransition(
      provider.verificationStatus as unknown as ProviderVerificationStatus,
      to,
    );

    await this.prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: {
        verificationStatus: to as unknown as PrismaVerificationStatus,
        ...(isEligibleForMatching(to) ? { lastVerifiedAt: new Date() } : {}),
      },
    });

    return this.recomputeTrustScore(providerProfileId, TrustSnapshotReason.VERIFICATION_TRANSITION);
  }

  /**
   * Ch58 — recomputed after any change to rating, job count, or verification
   * tier; the only two call sites are this method's own caller above and
   * RatingService.submit(). trustScore has no history of its own, so every
   * recompute also writes a ProviderTrustSnapshot row — the training data a
   * future ML trust-score model would learn from (see the ML roadmap). This
   * is the single choke point for that write; never duplicated elsewhere.
   */
  async recomputeTrustScore(providerProfileId: string, reason: TrustSnapshotReason) {
    const provider = await this.findById(providerProfileId);
    const trustScore = calculateTrustScore({
      ratingAverage: provider.ratingAverage,
      completedJobCount: provider.completedJobCount,
      verificationStatus: provider.verificationStatus as unknown as ProviderVerificationStatus,
    });
    const updated = await this.prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: { trustScore },
    });
    await this.prisma.providerTrustSnapshot.create({
      data: {
        providerProfileId,
        ratingAverage: updated.ratingAverage,
        completedJobCount: updated.completedJobCount,
        verificationStatus: updated.verificationStatus,
        trustScore: updated.trustScore,
        reason: reason as unknown as PrismaTrustSnapshotReason,
      },
    });
    return updated;
  }

  /**
   * Ch98's "clear de-listing triggers for lapsed... re-checks" — the manual
   * stand-in for Ch62's future recurring scheduler, same pattern as
   * MatchingService.sweepExpiredOffers() (ADR 0013). Finds every
   * PROVISIONAL/FULLY_VERIFIED provider whose re-verification window has
   * elapsed and transitions them straight to DELISTED, per Ch98's own
   * wording ("de-listing", not "suspension", for a lapsed re-check).
   */
  async sweepLapsedVerifications(): Promise<string[]> {
    const provisionalDays = Number(
      this.config.get("PROVIDER_PROVISIONAL_REVERIFICATION_DAYS", DEFAULT_PROVISIONAL_REVERIFICATION_DAYS),
    );
    const fullyVerifiedDays = Number(
      this.config.get(
        "PROVIDER_FULLY_VERIFIED_REVERIFICATION_DAYS",
        DEFAULT_FULLY_VERIFIED_REVERIFICATION_DAYS,
      ),
    );
    const now = Date.now();

    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        verificationStatus: { in: [PrismaVerificationStatus.PROVISIONAL, PrismaVerificationStatus.FULLY_VERIFIED] },
        lastVerifiedAt: { not: null },
      },
      select: { id: true, verificationStatus: true, lastVerifiedAt: true },
    });

    const lapsed = candidates.filter((provider) => {
      const cadenceDays =
        provider.verificationStatus === PrismaVerificationStatus.PROVISIONAL
          ? provisionalDays
          : fullyVerifiedDays;
      const dueAt = provider.lastVerifiedAt!.getTime() + cadenceDays * 24 * 60 * 60 * 1000;
      return now >= dueAt;
    });

    const delistedIds: string[] = [];
    for (const provider of lapsed) {
      await this.transitionVerificationStatus(provider.id, ProviderVerificationStatus.DELISTED);
      delistedIds.push(provider.id);
    }
    return delistedIds;
  }
}
