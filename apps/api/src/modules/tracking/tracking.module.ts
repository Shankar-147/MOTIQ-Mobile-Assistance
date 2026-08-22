import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingModule } from "../matching/matching.module";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingService } from "./tracking.service";

/**
 * Owns the WebSocket gateway and location_pings (Ch54, Ch75–77). Depends on
 * Provider (presence/location writes), Request (subscribe-ownership check),
 * and Matching (which request a provider's update belongs to) only through
 * their exported services, per ADR 0001.
 */
@Module({
  imports: [ProviderModule, RequestModule, MatchingModule],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
