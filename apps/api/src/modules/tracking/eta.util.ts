/**
 * Ch54's "ETA recomputation triggers" + ADR 0007's binding fallback: no ETA
 * prediction model exists (Ch85 is future ML work), so this IS the whole
 * implementation, not a degraded mode. Deliberately returns a range, not a
 * single number — Ch1's revised vision ("knowable within minutes... honesty
 * wins over false precision") requires showing uncertainty honestly rather
 * than fabricating confidence a straight-line-distance/fixed-speed estimate
 * doesn't actually have.
 */
export interface EtaEstimate {
  distanceMeters: number;
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
}

const DEFAULT_AVERAGE_SPEED_KMH = 30;
/** +/-30%: wide on purpose — a fixed-speed assumption over real, variable
 * urban/highway traffic is not a precise instrument. */
const UNCERTAINTY_FRACTION = 0.3;

export function estimateEta(
  distanceMeters: number,
  averageSpeedKmh: number = DEFAULT_AVERAGE_SPEED_KMH,
): EtaEstimate {
  if (distanceMeters < 0) {
    throw new Error("distanceMeters must not be negative");
  }
  if (averageSpeedKmh <= 0) {
    throw new Error("averageSpeedKmh must be positive");
  }

  const distanceKm = distanceMeters / 1000;
  const estimatedMinutes = (distanceKm / averageSpeedKmh) * 60;

  return {
    distanceMeters,
    estimatedMinutes: round(estimatedMinutes),
    minMinutes: round(estimatedMinutes * (1 - UNCERTAINTY_FRACTION)),
    maxMinutes: round(estimatedMinutes * (1 + UNCERTAINTY_FRACTION)),
  };
}

function round(minutes: number): number {
  return Math.max(0, Math.round(minutes));
}
