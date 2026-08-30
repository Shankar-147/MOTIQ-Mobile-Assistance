import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingModule } from "../matching/matching.module";
import { TrackingController } from "./tracking.controller";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingService } from "./tracking.service";
import { ROUTING_PORT } from "./routing/routing.port";
import { OsrmRoutingAdapter } from "./routing/osrm-routing.adapter";
import { RoutingService } from "./routing/routing.service";

/**
 * Owns the WebSocket gateway, location_pings (Ch54, Ch75–77), and — new —
 * the real-driving-route feature (Ch32/ADR 0012). Depends on Provider
 * (presence/location writes/reads), Request (subscribe-ownership check,
 * pickup location), and Matching (which request a provider's update/route
 * belongs to) only through their exported services, per ADR 0001. The
 * routing gateway is bound via the ROUTING_PORT token (Ch32) — RoutingService
 * never imports OsrmRoutingAdapter directly, so swapping providers later is
 * a one-line change here, not a rewrite.
 */
@Module({
  imports: [ProviderModule, RequestModule, MatchingModule],
  controllers: [TrackingController],
  providers: [
    TrackingGateway,
    TrackingService,
    RoutingService,
    { provide: ROUTING_PORT, useClass: OsrmRoutingAdapter },
  ],
  exports: [TrackingService],
})
export class TrackingModule {}
