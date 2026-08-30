/**
 * Canonicalizes a phone number to E.164 before it's ever used as an
 * identity key (OTP challenge lookup, User.phone). Without this, "9865613619"
 * and "+919865613619" hash/compare as different strings and silently create
 * two accounts for the same physical number — see the SUS Service duplicate
 * provider incident (2026-08-30). India-only per Ch7's pilot scope, so a
 * bare national number is assumed to be +91.
 */
export function normalizePhone(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  return trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
}
