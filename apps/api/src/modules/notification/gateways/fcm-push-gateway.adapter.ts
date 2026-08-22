import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PushGatewayPort } from "./push-gateway.port";

/**
 * Ch70's push channel via Firebase Cloud Messaging's legacy HTTP API
 * (`fcm/send` + server key) rather than the newer HTTP v1 API, which needs a
 * service-account OAuth2 exchange — deliberately avoided here to not pull in
 * an extra SDK (google-auth-library/firebase-admin) for a bootstrap phase
 * with no real FCM project configured. Tracked as provisional in ADR 0017;
 * migrate to HTTP v1 before this ships to production (FCM's legacy API is
 * deprecated). Degrades to isConfigured() === false with no server key set,
 * matching every other third-party adapter in this codebase.
 */
@Injectable()
export class FcmPushGatewayAdapter implements PushGatewayPort {
  private readonly logger = new Logger(FcmPushGatewayAdapter.name);
  private readonly serverKey: string | undefined;
  private static readonly FCM_LEGACY_SEND_URL = "https://fcm.googleapis.com/fcm/send";

  constructor(config: ConfigService) {
    this.serverKey = config.get<string>("FCM_SERVER_KEY");
    if (!this.serverKey) {
      this.logger.warn(
        "FCM_SERVER_KEY not set — push sends will be skipped (Ch32). Push notifications fall back to a " +
          "logged message until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return !!this.serverKey;
  }

  async sendPush(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    if (!this.serverKey) {
      throw new Error("FcmPushGatewayAdapter is not configured — check isConfigured() first.");
    }
    const response = await fetch(FcmPushGatewayAdapter.FCM_LEGACY_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `key=${this.serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.token,
        notification: { title: params.title, body: params.body },
        data: params.data ?? {},
      }),
    });
    if (!response.ok) {
      throw new Error(`FCM send failed with status ${response.status}`);
    }
  }
}
