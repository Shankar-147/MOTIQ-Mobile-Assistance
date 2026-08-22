import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import twilio, { Twilio } from "twilio";
import { SmsGatewayPort } from "./sms-gateway.port";

/**
 * Ch59's SMS channel. No Twilio credentials are configured in this bootstrap
 * phase (TWILIO_* are blank in .env.example) — degrades to isConfigured()
 * === false rather than throwing at startup, matching the RazorpayGatewayAdapter
 * pattern (ADR 0014).
 */
@Injectable()
export class TwilioSmsGatewayAdapter implements SmsGatewayPort {
  private readonly logger = new Logger(TwilioSmsGatewayAdapter.name);
  private readonly client: Twilio | null;
  private readonly fromNumber: string | undefined;

  constructor(config: ConfigService) {
    const accountSid = config.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = config.get<string>("TWILIO_AUTH_TOKEN");
    this.fromNumber = config.get<string>("TWILIO_FROM_NUMBER");
    this.client = accountSid && authToken ? twilio(accountSid, authToken) : null;

    if (!this.client || !this.fromNumber) {
      this.logger.warn(
        "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER not fully set — SMS sends will be skipped " +
          "(Ch32). OTP codes and SMS notifications fall back to a logged message until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !!this.fromNumber;
  }

  async sendSms(params: { to: string; body: string }): Promise<void> {
    if (!this.client || !this.fromNumber) {
      throw new Error("TwilioSmsGatewayAdapter is not configured — check isConfigured() first.");
    }
    await this.client.messages.create({
      to: params.to,
      from: this.fromNumber,
      body: params.body,
    });
  }
}
