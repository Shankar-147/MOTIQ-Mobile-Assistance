import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeoPoint, RouteResult, RoutingPort } from "./routing.port";

const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";
const REQUEST_TIMEOUT_MS = 5000;

interface OsrmResponse {
  code: string;
  routes?: {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
  }[];
}

/**
 * Ch32's Maps/routing adapter (ADR 0012 flagged this as future work — this
 * is that work). Uses OSRM's free public demo server by default: no API
 * key, no billing account, deliberately avoiding the exact Google Maps
 * billing-account dead-end this project already hit once for map tiles
 * (see LiveTrackingMap.tsx's doc comment). That demo server is explicitly
 * rate-limited and not meant for production traffic — OSRM_BASE_URL is
 * configurable specifically so a self-hosted or commercial OSRM/ORS
 * instance is a one-line env change before a real launch, never a rewrite.
 */
@Injectable()
export class OsrmRoutingAdapter implements RoutingPort {
  private readonly logger = new Logger(OsrmRoutingAdapter.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("OSRM_BASE_URL", DEFAULT_OSRM_BASE_URL);
  }

  async getRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null> {
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        this.logger.warn(`OSRM request failed with status ${response.status} — falling back to straight-line.`);
        return null;
      }

      const body = (await response.json()) as OsrmResponse;
      const route = body.routes?.[0];
      if (body.code !== "Ok" || !route) {
        this.logger.warn(`OSRM returned no route (code: ${body.code}) — falling back to straight-line.`);
        return null;
      }

      return {
        geometry: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
        distanceMeters: route.distance,
        durationSeconds: route.duration,
      };
    } catch (error) {
      this.logger.warn(`OSRM request errored — falling back to straight-line: ${(error as Error).message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
