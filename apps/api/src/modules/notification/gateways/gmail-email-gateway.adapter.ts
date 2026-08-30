import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";
import { EmailGatewayPort } from "./email-gateway.port";

/**
 * Gmail SMTP via Nodemailer, standing in for a real transactional-email
 * provider in this bootstrap phase (mirrors TwilioSmsGatewayAdapter's
 * "degrade to isConfigured() === false rather than throwing at startup"
 * pattern, ADR 0014). EMAIL_SMTP_USER is a Gmail address; EMAIL_SMTP_APP_PASSWORD
 * is a Google Account App Password (not the account's login password —
 * Gmail rejects plain-password SMTP auth), generated at
 * myaccount.google.com/apppasswords (requires 2-Step Verification enabled).
 */
@Injectable()
export class GmailEmailGatewayAdapter implements EmailGatewayPort {
  private readonly logger = new Logger(GmailEmailGatewayAdapter.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string | undefined;

  constructor(config: ConfigService) {
    const user = config.get<string>("EMAIL_SMTP_USER");
    const appPassword = config.get<string>("EMAIL_SMTP_APP_PASSWORD");
    this.fromAddress = user;
    this.transporter =
      user && appPassword
        ? createTransport({ service: "gmail", auth: { user, pass: appPassword } })
        : null;

    if (!this.transporter) {
      this.logger.warn(
        "EMAIL_SMTP_USER/EMAIL_SMTP_APP_PASSWORD not set — email sends will be skipped (Ch32). " +
          "OTP codes and email notifications fall back to a logged message until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmail(params: { to: string; subject: string; body: string }): Promise<void> {
    if (!this.transporter || !this.fromAddress) {
      throw new Error("GmailEmailGatewayAdapter is not configured — check isConfigured() first.");
    }
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });
  }
}
