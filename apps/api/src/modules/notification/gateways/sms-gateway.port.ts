/**
 * Ch32: every third-party call goes through an internal adapter. Notification
 * (and AuthService's OTP path) depends on this interface, not on Twilio
 * directly — see TwilioSmsGatewayAdapter and the SMS_GATEWAY injection token
 * in notification.module.ts.
 */
export interface SmsGatewayPort {
  /** False when no API keys are configured — see TwilioSmsGatewayAdapter's constructor. */
  isConfigured(): boolean;
  sendSms(params: { to: string; body: string }): Promise<void>;
}

export const SMS_GATEWAY = Symbol("SMS_GATEWAY");
