import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { NotificationEventListener } from "./notification-event.listener";
import { SMS_GATEWAY } from "./gateways/sms-gateway.port";
import { TwilioSmsGatewayAdapter } from "./gateways/twilio-sms-gateway.adapter";
import { PUSH_GATEWAY } from "./gateways/push-gateway.port";
import { FcmPushGatewayAdapter } from "./gateways/fcm-push-gateway.adapter";

/**
 * Owns Notification, PushDeviceToken, NotificationPreference and the
 * multi-channel (push/SMS/email) abstraction (Ch59, Ch79). Real Twilio/FCM
 * adapters (ADR 0017) sit behind SMS_GATEWAY/PUSH_GATEWAY injection tokens
 * (Ch32) — degrade to a logged fallback when unconfigured, the same pattern
 * PaymentModule established for Razorpay (ADR 0014).
 */
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventListener,
    { provide: SMS_GATEWAY, useClass: TwilioSmsGatewayAdapter },
    { provide: PUSH_GATEWAY, useClass: FcmPushGatewayAdapter },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
