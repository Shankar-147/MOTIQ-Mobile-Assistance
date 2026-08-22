import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * Owns AuditLog and the Admin-facing operations layer: the provider-
 * verification workflow backend (Ch61, Ch98) is implemented as of Phase 4 —
 * document review and verification-tier transitions delegate to
 * ProviderService (which owns the underlying entities and the guarded state
 * machine) and add the audit trail Admin owns. Manual dispatch override
 * (Ch61's other named responsibility) is not implemented yet.
 */
@Module({
  imports: [ProviderModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
