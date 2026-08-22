import { createHash, randomBytes } from "crypto";

/**
 * Refresh tokens (Ch33) are opaque random strings, not JWTs — a JWT refresh
 * token can't actually be revoked without a blocklist, which defeats the
 * point of "stateless." An opaque, DB-backed, hashed token can be rotated
 * and revoked for real (AuthService.refresh()). High entropy (32 random
 * bytes) means, unlike the OTP code, a fast hash is fine for storage lookup —
 * there's nothing to brute-force.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
