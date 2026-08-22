import { authenticator } from "otplib";

/**
 * Ch93's MFA strategy for Admin/Support accounts — TOTP (RFC 6238), the same
 * standard Google Authenticator/Authy/1Password etc. implement, so no
 * MOTIQ-specific authenticator app is needed. A thin wrapper around otplib
 * so the rest of the codebase never imports it directly (keeps the
 * dependency swappable, same reasoning as every other adapter in this
 * codebase, even though this one has no "unconfigured" fallback state — MFA
 * is either enrolled or it isn't, per-admin). Pinned to otplib v12 (not the
 * v13 rewrite) deliberately: v13's @scure/base dependency is ESM-only with
 * no CJS build, which breaks under this project's CommonJS compile target
 * (tsconfig.base.json's "module": "commonjs") both at runtime and under Jest.
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function generateTotpUri(secret: string, accountLabel: string): string {
  return authenticator.keyuri(accountLabel, "MOTIQ", secret);
}

export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    // otplib throws on a malformed token (e.g. non-numeric) — treat exactly
    // like an invalid code, not a server error.
    return false;
  }
}
