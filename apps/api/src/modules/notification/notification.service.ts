import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DevicePlatform, NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SMS_GATEWAY, SmsGatewayPort } from "./gateways/sms-gateway.port";
import { PUSH_GATEWAY, PushGatewayPort } from "./gateways/push-gateway.port";
import { isSuppressedByPreference, NotificationPreferenceLike } from "./notification-preference.util";

const DEFAULT_PREFERENCE: NotificationPreferenceLike = {
  smsEnabled: true,
  pushEnabled: true,
  emailEnabled: true,
  quietHoursStartHour: null,
  quietHoursEndHour: null,
};

/**
 * Ch59's multi-channel (push/SMS/email) abstraction. Real Twilio/FCM adapters
 * (ADR 0017) are wired behind SmsGatewayPort/PushGatewayPort (Ch32) —
 * unconfigured in this environment, so sends log loudly and the Notification
 * row still records SENT (the "honest degradation" pattern used throughout
 * this codebase: the app behaves as if delivery succeeded, since there's no
 * real provider to fail against).
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_GATEWAY) private readonly smsGateway: SmsGatewayPort,
    @Inject(PUSH_GATEWAY) private readonly pushGateway: PushGatewayPort,
  ) {}

  async send(params: {
    userId: string;
    channel: NotificationChannel;
    category: string;
    deliveryTier: NotificationDeliveryTier;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    const preference = await this.getOrCreatePreference(params.userId);
    const nowLocalHour = new Date().getHours();

    if (isSuppressedByPreference(preference, params.channel, params.deliveryTier, nowLocalHour)) {
      return this.prisma.notification.create({
        data: {
          userId: params.userId,
          channel: params.channel as unknown as never,
          category: params.category,
          deliveryTier: params.deliveryTier as unknown as never,
          payload: (params.payload ?? {}) as Prisma.InputJsonValue,
          status: "SUPPRESSED",
        },
      });
    }

    const delivered = await this.dispatch(params);

    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        channel: params.channel as unknown as never,
        category: params.category,
        deliveryTier: params.deliveryTier as unknown as never,
        payload: (params.payload ?? {}) as Prisma.InputJsonValue,
        status: delivered ? "SENT" : "FAILED",
        sentAt: delivered ? new Date() : null,
      },
    });
  }

  /**
   * OTP delivery is a security path, not a general notification — it fires
   * before a User row necessarily exists (a new-registration phone has none
   * yet), so it can't be preference-checked or persisted via `send()`'s
   * userId FK. Always CRITICAL-equivalent: never suppressed, never
   * preference-gated. See ADR 0017.
   */
  async sendOtpSms(phone: string, code: string, ttlSeconds: number): Promise<void> {
    const body = `Your MOTIQ verification code is ${code}. It expires in ${Math.round(ttlSeconds / 60)} minutes.`;
    if (!this.smsGateway.isConfigured()) {
      this.logger.log(`[DEV ONLY — no SMS provider wired, Ch32] OTP for ${phone}: ${code} (expires in ${ttlSeconds}s)`);
      return;
    }
    try {
      await this.smsGateway.sendSms({ to: phone, body });
    } catch (error) {
      this.logger.error(`Twilio OTP send to ${phone} failed: ${(error as Error).message}`);
      // The code would otherwise be unrecoverable — dispatchSms's unconfigured
      // fallback only fires when no gateway is wired at all, not when a wired
      // gateway's send fails (e.g. India's DLT template requirement rejecting
      // trial-account SMS). Same dev safety net, one more trigger condition.
      this.logger.log(`[DEV ONLY — SMS send failed, Ch32] OTP for ${phone}: ${code} (expires in ${ttlSeconds}s)`);
    }
  }

  async registerDeviceToken(userId: string, token: string, platform: DevicePlatform) {
    return this.prisma.pushDeviceToken.upsert({
      where: { token },
      create: { userId, token, platform: platform as unknown as never },
      update: { userId, lastSeenAt: new Date() },
    });
  }

  async getOwnPreference(userId: string) {
    return this.getOrCreatePreference(userId);
  }

  async updatePreference(userId: string, patch: Partial<NotificationPreferenceLike>) {
    await this.getOrCreatePreference(userId); // ensures a row exists
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: patch,
    });
  }

  private async getOrCreatePreference(userId: string): Promise<NotificationPreferenceLike> {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }
    return this.prisma.notificationPreference.create({
      data: { userId, ...DEFAULT_PREFERENCE },
    });
  }

  private async dispatch(params: {
    userId: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }): Promise<boolean> {
    if (params.channel === NotificationChannel.SMS) {
      return this.dispatchSms(params.userId, params.body);
    }
    if (params.channel === NotificationChannel.PUSH) {
      return this.dispatchPush(params.userId, params.title, params.body, params.payload);
    }
    // EMAIL has no adapter in this bootstrap phase — log-only, same as an
    // unconfigured SMS/push gateway.
    this.logger.log(`[EMAIL, no adapter wired] -> user ${params.userId}: ${params.title}`);
    return true;
  }

  private async dispatchSms(userId: string, body: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return false;
    }
    if (!this.smsGateway.isConfigured()) {
      this.logger.log(`[SMS, no provider wired] -> ${user.phone}: ${body}`);
      return true;
    }
    try {
      await this.smsGateway.sendSms({ to: user.phone, body });
      return true;
    } catch (error) {
      this.logger.error(`SMS send to ${user.phone} failed: ${(error as Error).message}`);
      return false;
    }
  }

  private async dispatchPush(
    userId: string,
    title: string,
    body: string,
    payload?: Record<string, unknown>,
  ): Promise<boolean> {
    const tokens = await this.prisma.pushDeviceToken.findMany({ where: { userId } });
    if (tokens.length === 0) {
      this.logger.log(`[PUSH, no registered device] -> user ${userId}: ${title}`);
      return true;
    }
    if (!this.pushGateway.isConfigured()) {
      this.logger.log(`[PUSH, no provider wired] -> user ${userId} (${tokens.length} device(s)): ${title}`);
      return true;
    }
    // FCM's data payload only accepts string values — this was previously
    // dropped entirely (never passed to sendPush at all), which meant every
    // push arrived with an empty data payload: a tapped "job offer"
    // notification had no assignmentId/serviceRequestId to deep-link with
    // (see pushRegistration.ts's addNotificationTapListener), so tapping it
    // just dismissed the notification and did nothing.
    const data = payload
      ? Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
      : undefined;
    let anySucceeded = false;
    for (const deviceToken of tokens) {
      try {
        await this.pushGateway.sendPush({ token: deviceToken.token, title, body, data });
        anySucceeded = true;
      } catch (error) {
        this.logger.error(`Push send to device ${deviceToken.id} failed: ${(error as Error).message}`);
      }
    }
    return anySucceeded;
  }
}
