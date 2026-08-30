import { apiClient } from "./client";

/** Ch32/ADR 0012's real-driving-route feature — pull-based, see
 * useRouteToPickup.ts for the client-side throttling that keeps this from
 * being called on every WebSocket location:update. */
export const trackingApi = {
  getRoute: (serviceRequestId: string) => apiClient.get(`/tracking/requests/${serviceRequestId}/route`),
};
