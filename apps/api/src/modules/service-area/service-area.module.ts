import { Module } from "@nestjs/common";
import { ServiceAreaController } from "./service-area.controller";
import { ServiceAreaService } from "./service-area.service";

/** Owns ServiceArea and (see Payment module) CommissionRate. See ADR 0006. */
@Module({
  controllers: [ServiceAreaController],
  providers: [ServiceAreaService],
  exports: [ServiceAreaService],
})
export class ServiceAreaModule {}
