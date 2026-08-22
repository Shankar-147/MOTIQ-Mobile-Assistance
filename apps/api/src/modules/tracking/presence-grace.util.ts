/**
 * Ch76's "reconnection-storm mitigation": a mobile provider's socket
 * disconnects constantly (tunnels, elevators, app backgrounding) without the
 * provider actually going offline. Marking them OFFLINE on every disconnect
 * would flap their matching eligibility and spam reconnect storms; a grace
 * period lets a fast reconnect cancel the pending offline transition. Pure
 * decision function — the timer/cancellation bookkeeping lives in
 * TrackingGateway, which is not unit-testable the same way.
 */
export function hasGracePeriodElapsed(disconnectedAt: Date, now: Date, gracePeriodMs: number): boolean {
  return now.getTime() - disconnectedAt.getTime() >= gracePeriodMs;
}
