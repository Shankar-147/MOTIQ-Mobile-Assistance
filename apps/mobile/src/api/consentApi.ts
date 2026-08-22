import { apiClient } from "./client";

/** Ch128 — must be granted before the backend accepts a request/presence
 * update that carries a location (see apps/api's ConsentService). Safe to
 * call every time right before a location-carrying action: granting an
 * already-active consent just creates a new grant record, never an error. */
export const consentApi = {
  grantLocationTracking: () => apiClient.post("/consent/location-tracking"),
};
