/**
 * Ch77's "throttling" requirement: a provider's phone can emit location
 * updates far faster than anything downstream needs (or that location_pings'
 * write volume should accept). Pure decision function so the actual
 * throttle policy is unit-testable without a live socket.
 */
export function shouldAcceptLocationUpdate(
  lastAcceptedAt: Date | null,
  now: Date,
  minIntervalMs: number,
): boolean {
  if (!lastAcceptedAt) {
    return true;
  }
  return now.getTime() - lastAcceptedAt.getTime() >= minIntervalMs;
}
