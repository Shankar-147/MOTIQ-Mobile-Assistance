import { apiClient } from "./client";

/** Ch55 — deliberately no offline-queue integration (unlike requestApi):
 * an SOS trigger must reach the server immediately or the user needs to
 * know it didn't, never silently queue for "later." */
export const sosApi = {
  trigger: (params: { latitude?: number; longitude?: number; serviceRequestId?: string }) =>
    apiClient.post<{ alertId: string; message: string }>("/sos/trigger", params),
};
