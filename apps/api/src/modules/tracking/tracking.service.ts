import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PresenceStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProviderService } from "../provider/provider.service";
import { MatchingService } from "../matching/matching.service";
import { estimateEta, EtaEstimate } from "./eta.util";
import { shouldAcceptLocationUpdate } from "./location-throttle.util";

const DEFAULT_MIN_INTERVAL_MS = 3000;

export interface LocationUpdateResult {
  serviceRequestId: string | null;
  eta: EtaEstimate | null;
}

/**
 * Ch54's write path: throttle, persist to location_pings (Ch40), update the
 * live currentLocation (Ch39), and recompute ETA if the provider currently
 * holds an accepted job. The throttle state (lastAcceptedAt per provider) is
 * in-memory and per-instance — fine for a single-instance deployment; a
 * multi-instance deployment behind the Redis WS adapter would need this
 * moved to Redis too, not implemented here (see docs/decisions/0015-*.md).
 */
@Injectable()
export class TrackingService {
  private readonly lastAcceptedAt = new Map<string, Date>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly matchingService: MatchingService,
    private readonly config: ConfigService,
  ) {}

  async handleLocationUpdate(
    providerProfileId: string,
    latitude: number,
    longitude: number,
  ): Promise<LocationUpdateResult | null> {
    const minIntervalMs = Number(
      this.config.get("LOCATION_UPDATE_MIN_INTERVAL_MS", DEFAULT_MIN_INTERVAL_MS),
    );
    const now = new Date();
    if (!shouldAcceptLocationUpdate(this.lastAcceptedAt.get(providerProfileId) ?? null, now, minIntervalMs)) {
      return null; // throttled — see location-throttle.util.ts
    }
    this.lastAcceptedAt.set(providerProfileId, now);

    await this.providerService.setPresence(providerProfileId, PresenceStatus.ONLINE, {
      latitude,
      longitude,
    });
    await this.prisma.locationPing.create({
      data: { providerProfileId, latitude, longitude, recordedAt: now },
    });

    const activeAssignment = await this.matchingService.getActiveAssignmentForProvider(providerProfileId);
    if (!activeAssignment) {
      return { serviceRequestId: null, eta: null };
    }

    const distanceMeters = await this.providerService.getDistanceToServiceRequestPickup(
      providerProfileId,
      activeAssignment.serviceRequestId,
    );

    return {
      serviceRequestId: activeAssignment.serviceRequestId,
      eta: distanceMeters !== null ? estimateEta(distanceMeters) : null,
    };
  }
}
