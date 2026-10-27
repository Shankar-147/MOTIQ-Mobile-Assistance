import * as Location from "expo-location";
import { sendLocationUpdate } from "../../realtime/trackingSocket";

let watchSubscription: Location.LocationSubscription | null = null;

/**
 * Ch68's real subject is background location (tracking while the app is
 * backgrounded, with iOS/Android-specific constraints) — that needs
 * `expo-task-manager` + `Location.startLocationUpdatesAsync`'s background
 * task registration, deliberately NOT built in this phase (see
 * docs/roadmap.md's Reconciliation Notes). This is foreground-only tracking:
 * it stops as soon as the app backgrounds, same as ADR 0015's throttled
 * server-side accept window assumes a live socket connection either way.
 */
export async function startForegroundLocationTracking(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return false;
  }
  watchSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
    (position) => {
      sendLocationUpdate(position.coords.latitude, position.coords.longitude);
    },
  );
  return true;
}

export interface SimulatedPoint {
  latitude: number;
  longitude: number;
}

const SIMULATED_STEPS = 9;
// The tracking gateway accepts at most one location update per ~3 seconds.
const SIMULATED_INTERVAL_MS = 3300;

/**
 * Demo tool: walks a provider from `from` to `to` in a few steps, sending each position
 * over the same socket event real GPS uses, so live tracking visibly moves even when both
 * phones are in one room. Real GPS tracking is paused while it runs. Returns a cancel function.
 */
export function startSimulatedDrive(
  from: SimulatedPoint,
  to: SimulatedPoint,
  onPosition: (point: SimulatedPoint) => void,
  onDone: () => void,
): () => void {
  stopLocationTracking();
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    const t = Math.min(step / SIMULATED_STEPS, 1);
    const point = {
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    };
    sendLocationUpdate(point.latitude, point.longitude);
    onPosition(point);
    if (t >= 1) {
      clearInterval(timer);
      onDone();
    }
  }, SIMULATED_INTERVAL_MS);
  return () => clearInterval(timer);
}

export function stopLocationTracking(): void {
  watchSubscription?.remove();
  watchSubscription = null;
}
