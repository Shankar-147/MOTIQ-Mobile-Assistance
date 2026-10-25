import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { GeoPoint } from "../../components/LiveTrackingMap";

type PermissionState = "unknown" | "granted" | "denied";

/** Best-effort device position for map backdrops. Never blocks a screen: with
 * permission already granted it reads the last known fix and falls back to a
 * balanced current fix; otherwise `request()` asks on demand. */
export function useDeviceLocation() {
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [permission, setPermission] = useState<PermissionState>("unknown");

  const load = useCallback(async () => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setPosition({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch {
      // Keep whatever fix we already have; the map shows a placeholder if none.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (cancelled) return;
        setPermission(status === "granted" ? "granted" : "denied");
        if (status === "granted") void load();
      })
      .catch(() => !cancelled && setPermission("denied"));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const request = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status === "granted" ? "granted" : "denied");
    if (status === "granted") await load();
  }, [load]);

  return { position, permission, request };
}
