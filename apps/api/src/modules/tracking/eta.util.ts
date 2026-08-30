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

/** +/-10%: a real routing engine's duration over an actual road path is
 * genuinely more precise than the fixed-speed straight-line guess above —
 * a narrower band here is honest, not fabricated confidence. Still a range,
 * never a bare point estimate, for the same Ch1 reason as estimateEta(). */
const ROUTE_UNCERTAINTY_FRACTION = 0.1;

/**
 * Ch32's routing feature (RoutingService) feeds a real route's duration
 * through here rather than inventing its own ETA shape — same EtaEstimate
 * contract as the straight-line estimateEta() above, so callers/mobile don't
 * need to know which source produced a given estimate.
 */
export function estimateEtaFromRouteDuration(distanceMeters: number, durationSeconds: number): EtaEstimate {
  if (distanceMeters < 0) {
    throw new Error("distanceMeters must not be negative");
  }
  if (durationSeconds < 0) {
    throw new Error("durationSeconds must not be negative");
  }

  const estimatedMinutes = durationSeconds / 60;
  return {
    distanceMeters,
    estimatedMinutes: round(estimatedMinutes),
    minMinutes: round(estimatedMinutes * (1 - ROUTE_UNCERTAINTY_FRACTION)),
    maxMinutes: round(estimatedMinutes * (1 + ROUTE_UNCERTAINTY_FRACTION)),
  };
}
