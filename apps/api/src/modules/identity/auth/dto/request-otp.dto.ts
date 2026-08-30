import { IsEmail, Matches } from "class-validator";

// Loose E.164-ish check — full validation (real number, region) is Ch32's
// SMS-provider integration concern, not this bootstrap phase's.
const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;

export class RequestOtpDto {
  @Matches(PHONE_PATTERN, { message: "phone must be a valid phone number" })
  phone!: string;

  // OTP delivery channel — phone stays the account identity (Ch50), this is
  // only where the code itself gets sent. Twilio's trial-account restriction
  // (see GmailEmailGatewayAdapter's doc comment) made email the delivery
  // channel for now instead of SMS.
  @IsEmail()
  email!: string;
}
