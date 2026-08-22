import { Module } from "@nestjs/common";
import { RequestModule } from "../request/request.module";
import { MatchingModule } from "../matching/matching.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

/** Owns FareConfig and fare calculation (Ch56, ADR 0012). Depends on Request
 * (for serviceAreaId) and Matching (for the accepted assignment's distance)
 * only through their exported services, per ADR 0001. */
@Module({
  imports: [RequestModule, MatchingModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
