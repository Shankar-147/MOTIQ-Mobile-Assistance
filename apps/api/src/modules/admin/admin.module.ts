import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingModule } from "../matching/matching.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * Owns AuditLog and the Admin-facing operations layer: the provider-
 * verification workflow backend (Ch61, Ch98, Phase 4) and manual dispatch
 * override (Ch61's other named responsibility, this phase) both delegate the
 * actual mutation to their owning module's exported service (ProviderModule,
 * MatchingModule) per ADR 0001, and add the audit trail Admin owns.
 */
@Module({
  imports: [ProviderModule, RequestModule, MatchingModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
