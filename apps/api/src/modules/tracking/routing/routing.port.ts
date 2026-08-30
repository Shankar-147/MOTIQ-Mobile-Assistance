export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  /** Ordered points along the actual road path, for drawing a real polyline
   * instead of a straight line — see LiveTrackingMap.tsx on the mobile side. */
  geometry: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Ch32: every third-party call goes through an internal adapter — no direct
 * HTTP call to a routing vendor from domain code. Returns null (never
 * throws) on any failure, exactly like PaymentGatewayPort/PushGatewayPort's
 * established pattern — a routing failure degrades to the existing
 * straight-line distance/ETA (ADR 0007's mandatory fallback), it never
 * breaks live tracking.
 */
export interface RoutingPort {
  getRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null>;
}

export const ROUTING_PORT = Symbol("ROUTING_PORT");
