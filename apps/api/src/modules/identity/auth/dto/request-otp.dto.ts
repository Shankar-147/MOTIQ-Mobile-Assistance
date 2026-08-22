import { Matches } from "class-validator";

// Loose E.164-ish check — full validation (real number, region) is Ch32's
// SMS-provider integration concern, not this bootstrap phase's.
const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;

export class RequestOtpDto {
  @Matches(PHONE_PATTERN, { message: "phone must be a valid phone number" })
  phone!: string;
}
