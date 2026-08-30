/**
 * Ch32: every third-party call goes through an internal adapter. Notification
 * (and AuthService's OTP path) depends on this interface, not on Nodemailer
 * directly — see GmailEmailGatewayAdapter and the EMAIL_GATEWAY injection
 * token in notification.module.ts. Mirrors SmsGatewayPort's shape.
 */
export interface EmailGatewayPort {
  /** False when no SMTP credentials are configured — see the adapter's constructor. */
  isConfigured(): boolean;
  sendEmail(params: { to: string; subject: string; body: string }): Promise<void>;
}

export const EMAIL_GATEWAY = Symbol("EMAIL_GATEWAY");
