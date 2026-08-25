import { Module } from "@nestjs/common";
import { ConsentModule } from "../consent/consent.module";
import { RequestController } from "./request.controller";
import { RequestService } from "./request.service";

/** Owns the Ch19 state machine. See ADR 0004. Imports ConsentModule to gate
 * request creation on Ch128's location-tracking consent — see RequestController.
 * Deliberately does NOT import PaymentModule: PaymentModule already imports
 * PricingModule, which imports RequestModule (for serviceAreaId lookups) —
 * a reverse import here would form a circular module graph (RequestModule ->
 * PaymentModule -> PricingModule -> RequestModule), which NestJS's DI
 * container cannot resolve. The mobile receipt read (GET /requests/:id/payment)
 * lives on PaymentController instead — see payment.module.ts's comment. */
@Module({
  imports: [ConsentModule],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}
