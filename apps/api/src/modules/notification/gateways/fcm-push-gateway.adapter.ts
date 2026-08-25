import { createSign } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PushGatewayPort } from "./push-gateway.port";

interface CachedAccessToken {
  token: string;
  expiresAtMs: number;
}

/**
 * Ch70's push channel via Firebase Cloud Messaging's HTTP v1 API. FCM's
 * legacy `fcm/send` + server-key API (this adapter's previous
 * implementation) was shut down by Google in June 2024, so HTTP v1's
 * service-account OAuth2 flow is no longer optional (ADR 0017). The OAuth2
 * JWT exchange is hand-rolled with node:crypto's RS256 signing rather than
 * pulling in firebase-admin/google-auth-library — same "no extra SDK for one
 * REST call" reasoning this adapter already used for the legacy API.
 * Degrades to isConfigured() === false with no service-account credentials
 * set, matching every other third-party adapter in this codebase.
 */
@Injectable()
export class FcmPushGatewayAdapter implements PushGatewayPort {
  private readonly logger = new Logger(FcmPushGatewayAdapter.name);
  private readonly projectId: string | undefined;
  private readonly clientEmail: string | undefined;
  private readonly privateKey: string | undefined;
  private cachedAccessToken: CachedAccessToken | undefined;

  private static readonly TOKEN_URL = "https://oauth2.googleapis.com/token";
  private static readonly SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
  // Refresh a little before actual expiry so a send never races an expiring token.
  private static readonly TOKEN_REFRESH_SKEW_MS = 60_000;

  constructor(config: ConfigService) {
    this.projectId = config.get<string>("FCM_PROJECT_ID");
    this.clientEmail = config.get<string>("FCM_CLIENT_EMAIL");
    // .env stores literal "\n" escapes inside the quoted PEM value — real
    // newlines aren't representable in a single env-file line.
    const rawPrivateKey = config.get<string>("FCM_PRIVATE_KEY");
    this.privateKey = rawPrivateKey?.replace(/\\n/g, "\n");

    if (!this.isConfigured()) {
      this.logger.warn(
        "FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY not fully set — push sends will be skipped (Ch32). " +
          "Push notifications fall back to a logged message until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return !!this.projectId && !!this.clientEmail && !!this.privateKey;
  }

  async sendPush(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("FcmPushGatewayAdapter is not configured — check isConfigured() first.");
    }
    const accessToken = await this.getAccessToken();
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: params.token,
            notification: { title: params.title, body: params.body },
            data: params.data ?? {},
          },
        }),
      },
    );
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`FCM send failed with status ${response.status}: ${responseBody}`);
    }
    this.logger.log(`FCM send succeeded: ${responseBody}`);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAtMs > now) {
      return this.cachedAccessToken.token;
    }

    const assertion = this.signServiceAccountJwt(now);
    const response = await fetch(FcmPushGatewayAdapter.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!response.ok) {
      throw new Error(`FCM OAuth2 token exchange failed with status ${response.status}`);
    }
    const body = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedAccessToken = {
      token: body.access_token,
      expiresAtMs: now + body.expires_in * 1000 - FcmPushGatewayAdapter.TOKEN_REFRESH_SKEW_MS,
    };
    return body.access_token;
  }

  private signServiceAccountJwt(nowMs: number): string {
    const nowSeconds = Math.floor(nowMs / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: this.clientEmail,
      scope: FcmPushGatewayAdapter.SCOPE,
      aud: FcmPushGatewayAdapter.TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    };
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsignedToken = `${encode(header)}.${encode(claimSet)}`;

    const signer = createSign("RSA-SHA256");
    signer.update(unsignedToken);
    const signature = signer.sign(this.privateKey!).toString("base64url");

    return `${unsignedToken}.${signature}`;
  }
}
