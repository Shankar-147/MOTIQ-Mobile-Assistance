import { Inject, Injectable } from "@nestjs/common";
import { ProviderService } from "../../provider/provider.service";
import { RequestService } from "../../request/request.service";
import { MatchingService } from "../../matching/matching.service";
import { estimateEta, estimateEtaFromRouteDuration, EtaEstimate } from "../eta.util";
import { GeoPoint, ROUTING_PORT, RoutingPort } from "./routing.port";

export interface RouteForRequest {
  /** Null when no route provider could compute a real road path (rate
   * limited, offline, point outside its coverage, etc.) — the mobile map
   * falls back to its existing straight dashed connector, never breaks. */
  geometry: GeoPoint[] | null;
  distanceMeters: number;
  eta: EtaEstimate;
}

/**
 * Pull-based route computation (Ch32/ADR 0012's previously-unbuilt piece) —
 * deliberately NOT wired into TrackingGateway's per-location-update path.
 * A provider's location ping fires as often as every
 * LOCATION_UPDATE_MIN_INTERVAL_MS (default 3s); calling a routing API on
 * every single one would hammer the free OSRM demo server for no benefit,
 * since the road path itself barely changes between pings. The mobile app
 * instead pulls this endpoint on its own much coarser throttle (moved a
 * meaningful distance, or a fixed interval) — see LiveTrackingMap's caller.
 */
@Injectable()
export class RoutingService {
  constructor(
    private readonly providerService: ProviderService,
    private readonly requestService: RequestService,
    private readonly matchingService: MatchingService,
    @Inject(ROUTING_PORT) private readonly routingPort: RoutingPort,
  ) {}

  async getRouteForRequest(serviceRequestId: string): Promise<RouteForRequest | null> {
    const assignment = await this.matchingService.getAcceptedAssignment(serviceRequestId);
    const request = await this.requestService.findById(serviceRequestId);
    const providerLocation = await this.providerService.getCurrentLocation(assignment.providerProfileId);

    if (!providerLocation || !request.pickupLocation) {
      return null; // Provider or pickup location temporarily unavailable — a normal transient state.
    }

    const straightLineDistanceMeters = await this.providerService.getDistanceToServiceRequestPickup(
      assignment.providerProfileId,
      serviceRequestId,
    );

    const route = await this.routingPort.getRoute(providerLocation, request.pickupLocation);
    if (!route) {
      return {
        geometry: null,
        distanceMeters: straightLineDistanceMeters ?? 0,
        eta: estimateEta(straightLineDistanceMeters ?? 0),
      };
    }

    return {
      geometry: route.geometry,
      distanceMeters: route.distanceMeters,
      eta: estimateEtaFromRouteDuration(route.distanceMeters, route.durationSeconds),
    };
  }
}
