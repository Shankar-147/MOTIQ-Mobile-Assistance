import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { RequestModule } from "../request/request.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway.port";
import { RazorpayGatewayAdapter } from "./gateways/razorpay-gateway.adapter";

/**
 * Owns CommissionRate and Payment (ADR 0003, Ch57). The gateway is bound to
 * PaymentGatewayPort via the PAYMENT_GATEWAY token (Ch32) — PaymentService
 * never imports RazorpayGatewayAdapter directly, so a different gateway (or
 * a test double) is a one-line change here, not a PaymentService rewrite.
 * RequestModule is imported directly (redundant with PricingModule's own
 * import of it, but explicit) for the mobile receipt endpoint's ownership
 * check — see PaymentController.findByServiceRequest(). RequestModule must
 * never import PaymentModule back (a circular module graph NestJS can't
 * resolve) — see request.module.ts's comment.
 */
@Module({
  imports: [PricingModule, RequestModule],
  controllers: [PaymentController],
  providers: [PaymentService, { provide: PAYMENT_GATEWAY, useClass: RazorpayGatewayAdapter }],
  exports: [PaymentService],
})
export class PaymentModule {}
