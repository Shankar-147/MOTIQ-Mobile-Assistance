/**
 * Ch99's fraud-detection concern applied to the one signal this codebase
 * already has real data for: consecutive location_pings from the same
 * provider. A physically-implausible speed between two pings (teleporting
 * across a city in a few seconds) is the simplest real signal of GPS
 * spoofing or a client sending fabricated coordinates for fake job
 * completion (Ch99's named scenario). This is deliberately advisory, not
 * enforcement — ADR 0007's "additive, never load-bearing" principle applies
 * here too: a heuristic false positive (a real provider whose GPS briefly
 * glitched) must never block a legitimate job completion or payment. See
 * ADR 0020.
 */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  recordedAt: Date;
}

/** ~350 km/h — well above any real road vehicle, chosen to only flag
 * genuinely implausible jumps, not GPS jitter or a fast highway. Provisional,
 * same tuning-constant status as every other threshold in this codebase. */
const MAX_PLAUSIBLE_SPEED_METERS_PER_SECOND = 97;
/** Below this elapsed time, GPS jitter alone can imply a huge instantaneous
 * speed even for a stationary provider — don't flag those. */
const MIN_ELAPSED_SECONDS_TO_EVALUATE = 2;

function haversineDistanceMeters(a: LocationPoint, b: LocationPoint): number {
  const EARTH_RADIUS_METERS = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function detectImplausibleMovement(previous: LocationPoint | null, current: LocationPoint): boolean {
  if (!previous) {
    return false;
  }
  const elapsedSeconds = (current.recordedAt.getTime() - previous.recordedAt.getTime()) / 1000;
  if (elapsedSeconds < MIN_ELAPSED_SECONDS_TO_EVALUATE) {
    return false;
  }

  const distanceMeters = haversineDistanceMeters(previous, current);
  const impliedSpeed = distanceMeters / elapsedSeconds;
  return impliedSpeed > MAX_PLAUSIBLE_SPEED_METERS_PER_SECOND;
}
