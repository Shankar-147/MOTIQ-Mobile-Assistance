import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";

/**
 * Owns AuditLog and (future) AdminProfile-specific operations: manual
 * dispatch override, provider-verification review workflow (Ch61). Scaffolded
 * as a module boundary in this bootstrap phase; only audit-log writing is
 * implemented so far, called from the write paths noted in docs/security.md.
 */
@Module({
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
