import { createHash, randomInt } from "crypto";

/**
 * Pure OTP generation/hashing helpers (Ch50). A 6-digit code only has 900,000
 * possibilities, so a plain SHA-256 hash (fast) rather than a slow password
 * hash (bcrypt/argon2) is the right tool here — the actual protection against
 * brute force is the short expiry and the attempts counter in AuthService,
 * not the hash algorithm. Contrast with admin password hashing (bcryptjs,
 * see auth.service.ts), where the secret itself has enough entropy that a
 * slow hash is the correct defense.
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  return hashOtpCode(code) === hash;
}
