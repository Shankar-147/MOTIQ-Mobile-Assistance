import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PresenceStatus as PrismaPresenceStatus,
  ProviderVerificationStatus as PrismaVerificationStatus,
  VerificationDocumentStatus as PrismaDocumentStatus,
} from "@prisma/client";
import { PresenceStatus, ProviderVerificationStatus, VerificationDocumentType } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  assertValidVerificationTransition,
  isEligibleForMatching,
} from "./provider-verification-state-machine";
import { calculateTrustScore } from "./trust-score.util";

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
   * supplied reference (no real storage/scanning integration — see ADR 0016). */
  async submitVerificationDocument(
    providerProfileId: string,
    documentType: VerificationDocumentType,
    fileUrl: string,
  ) {
    await this.findById(providerProfileId);
    return this.prisma.providerVerificationDocument.create({
      data: { providerProfileId, documentType, fileUrl },
    });
  }

  async listOwnVerificationDocuments(providerProfileId: string) {
    return this.prisma.providerVerificationDocument.findMany({
      where: { providerProfileId },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Ch61's provider-verification workflow backend reads through this — see AdminService. */
  async listPendingVerificationDocuments() {
    return this.prisma.providerVerificationDocument.findMany({
      where: { status: PrismaDocumentStatus.PENDING },
      orderBy: { submittedAt: "asc" },
    });
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

    return this.prisma.providerVerificationDocument.update({
      where: { id: documentId },
      data: {
        status: decision as unknown as PrismaDocumentStatus,
        reviewedByUserId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });
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

    return this.recomputeTrustScore(providerProfileId);
  }

  /** Ch58 — recomputed after any change to rating, job count, or verification tier. */
  async recomputeTrustScore(providerProfileId: string) {
    const provider = await this.findById(providerProfileId);
    const trustScore = calculateTrustScore({
      ratingAverage: provider.ratingAverage,
      completedJobCount: provider.completedJobCount,
      verificationStatus: provider.verificationStatus as unknown as ProviderVerificationStatus,
    });
    return this.prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: { trustScore },
    });
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
