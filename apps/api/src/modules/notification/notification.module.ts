import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";

/**
 * Owns Notification and the multi-channel (push/SMS/email) abstraction
 * (Ch59, Ch79). Delivery-tier distinction (CRITICAL vs. BEST_EFFORT) exists
 * in the schema now; real channel adapters (Ch32) are not wired in this
 * bootstrap phase — see the Reconciliation Notes.
 */
@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
