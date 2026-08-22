import { Injectable, NotFoundException } from "@nestjs/common";
import { PresenceStatus as PrismaPresenceStatus } from "@prisma/client";
import { PresenceStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";

interface NearbyProviderRow {
  id: string;
  distanceMeters: number;
}

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

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
      ) AS "distanceMeters"
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
   * own pickupLocation — the ranking itself is a hard distance-sort (ADR
   * 0007/Ch35's non-negotiable fallback; no ranking model exists yet).
   * Excludes any provider already offered this request (any outcome —
   * offered, accepted, rejected, or timed out), so a reassignment retry
   * never re-asks someone who already answered.
   */
  async findNearestAvailableProvidersForRequest(
    serviceRequestId: string,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyProviderRow[]> {
    return this.prisma.$queryRaw<NearbyProviderRow[]>`
      SELECT pp.id, ST_Distance(pp."currentLocation", sr."pickupLocation") AS "distanceMeters"
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
}
