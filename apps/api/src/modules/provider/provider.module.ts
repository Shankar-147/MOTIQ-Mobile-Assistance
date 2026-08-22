import { Module } from "@nestjs/common";
import { ConsentModule } from "../consent/consent.module";
import { ProviderController } from "./provider.controller";
import { ProviderService } from "./provider.service";

/**
 * Owns ProviderProfile and ProviderFleetVehicle, including verification-status
 * transitions (Ch98, ADR 0005) and presence/location updates. Nearest-provider
 * lookup lives here (raw SQL against the PostGIS `currentLocation` column,
 * ADR 0002) since it's a Provider-owned query, consumed by the Matching module
 * through this service's exported method — never a direct cross-module query.
 */
@Module({
  imports: [ConsentModule],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
