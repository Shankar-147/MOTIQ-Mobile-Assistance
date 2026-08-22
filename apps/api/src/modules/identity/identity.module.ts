import { Module } from "@nestjs/common";
import { IdentityService } from "./identity.service";

/**
 * Owns User, CustomerProfile, ProviderProfile, AdminProfile, and (future)
 * OTP/JWT auth (Ch33, Ch50, Ch51). Scaffolded as a module boundary in this
 * bootstrap phase — registration/login/token issuance is not implemented yet;
 * see docs/architecture.md §5 and the Reconciliation Notes.
 */
@Module({
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
