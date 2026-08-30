import { Module } from "@nestjs/common";
import { ProviderFleetVehicleController } from "./provider-fleet-vehicle.controller";
import { ProviderFleetVehicleService } from "./provider-fleet-vehicle.service";

/** Owns ProviderFleetVehicle CRUD — split out from ProviderModule (which owns
 * ProviderProfile/verification/presence) the same way VehicleModule is split
 * out from CustomerModule, keeping each module's write surface narrow. */
@Module({
  controllers: [ProviderFleetVehicleController],
  providers: [ProviderFleetVehicleService],
  exports: [ProviderFleetVehicleService],
})
export class ProviderFleetVehicleModule {}
