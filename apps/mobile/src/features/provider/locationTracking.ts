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

export function stopLocationTracking(): void {
  watchSubscription?.remove();
  watchSubscription = null;
}
