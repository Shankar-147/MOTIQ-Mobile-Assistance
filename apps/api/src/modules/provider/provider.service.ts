import { Injectable, NotFoundException } from "@nestjs/common";
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
   * The nearest-provider query Ch39 requires to go through PostGIS, not
   * application-side filtering. Consumed by MatchingService — see Ch53.
   * Not wired into a controller yet in this bootstrap phase (Matching itself
   * is a scaffold-only module here); kept here as the documented, correct
   * pattern for whoever implements Ch53's candidate retrieval next.
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
}
