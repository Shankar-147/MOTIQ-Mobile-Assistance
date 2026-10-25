import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingModule } from "../matching/matching.module";
import { PaymentModule } from "../payment/payment.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * Owns AuditLog and the Admin-facing operations layer: the provider-
 * verification workflow backend (Ch61, Ch98, Phase 4), manual dispatch
 * override, admin refund, and account suspension (Ch61's other named
 * responsibilities) all delegate the actual mutation to their owning
 * module's exported service (ProviderModule, MatchingModule, PaymentModule,
 * IdentityService — the last one global per IdentityModule, no import
 * needed, same as PrismaService) per ADR 0001, and add the audit trail
 * Admin owns.
 */
@Module({
  imports: [ProviderModule, RequestModule, MatchingModule, PaymentModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
