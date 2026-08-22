import * as bcrypt from "bcryptjs";

/**
 * Admin/Support password hashing (Ch33, Ch93). Unlike OTP codes and refresh
 * tokens (see otp.util.ts, token.util.ts), a human-chosen password has low
 * entropy relative to its length, so a slow, salted hash is the right tool —
 * bcryptjs specifically because it's pure JS (no native build step), which
 * matters in this environment (no confirmed C++ build toolchain — see
 * docs/development.md's environment assessment).
 */
const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
