import { useEffect, useRef, useState } from "react";
import { trackingApi } from "../api/trackingApi";
import { GeoPoint } from "../components/LiveTrackingMap";

const MIN_REFETCH_INTERVAL_MS = 20_000;
const MIN_REFETCH_DISTANCE_METERS = 150;

export interface RouteEta {
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  distanceMeters: number;
}

export interface RouteData {
  geometry: GeoPoint[] | null;
  distanceMeters: number;
  eta: RouteEta;
}

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

/**
 * Ch32/ADR 0012's real-driving-route feature, client side. Deliberately NOT
 * fetched on every WebSocket location:update (those can arrive as often as
 * every few seconds) — the free OSRM demo server backing this in dev is
 * rate-limited, and the road path itself barely changes between pings
 * anyway. Refetches only when the moving point has moved a meaningful
 * distance or enough time has passed, whichever comes first — see
 * RoutingService's own doc comment on the backend side of this same
 * reasoning.
 */
export function useRouteToPickup(serviceRequestId: string, moving: GeoPoint | null): RouteData | null {
  const [route, setRoute] = useState<RouteData | null>(null);
  const lastFetchRef = useRef<{ at: number; point: GeoPoint } | null>(null);

  useEffect(() => {
    if (!moving) {
      lastFetchRef.current = null;
      setRoute(null);
      return;
    }

    const last = lastFetchRef.current;
    const now = Date.now();
    const shouldFetch =
      !last ||
      now - last.at >= MIN_REFETCH_INTERVAL_MS ||
      haversineMeters(last.point, moving) >= MIN_REFETCH_DISTANCE_METERS;
    if (!shouldFetch) {
      return;
    }

    lastFetchRef.current = { at: now, point: moving };
    trackingApi
      .getRoute(serviceRequestId)
      .then((response) => setRoute(response.data as RouteData | null))
      .catch(() => undefined);
  }, [serviceRequestId, moving?.latitude, moving?.longitude]);

  return route;
}
