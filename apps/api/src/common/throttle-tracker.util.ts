/**
 * Ch95's binding requirement: "per-user/per-provider rate limiting, not just
 * a generic gateway-level limit — a compromised single account should not be
 * able to exhaust shared capacity." @nestjs/throttler's default tracker is
 * IP-only, which fails exactly that scenario (many users, one NAT/proxy IP;
 * one compromised account, many IPs via a botnet). This resolves a stable
 * per-user key from the JWT's `sub` claim when present, falling back to IP
 * for unauthenticated requests (OTP request, login itself) — those still
 * need a limit, just necessarily an IP-based one. See ADR 0020.
 *
 * Decoding here is for rate-limit BUCKETING only, never for authorization —
 * it never verifies the signature (a forged token still gets bucketed by
 * its claimed `sub`, but still can't pass the real JwtAuthGuard downstream),
 * so this never substitutes for real auth.
 */
export function resolveThrottleTracker(
  authorizationHeader: string | undefined,
  decodeSub: (token: string) => string | null,
  ip: string,
): string {
  if (authorizationHeader?.startsWith("Bearer ")) {
    const token = authorizationHeader.slice("Bearer ".length);
    const sub = decodeSub(token);
    if (sub) {
      return `user:${sub}`;
    }
  }
  return `ip:${ip}`;
}
