import { apiClient } from "./client";

/** GET /service-areas is deliberately unauthenticated (ServiceAreaController)
 * so a not-yet-fully-onboarded client can still show a city picker. */
export const serviceAreaApi = {
  list: () => apiClient.get("/service-areas"),
};
