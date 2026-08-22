import { GeoPoint, PresenceStatus, RequestStatus } from "@motiq/types";
import { apiClient } from "./client";

export const providerApi = {
  updatePresence: (presenceStatus: PresenceStatus, location?: GeoPoint) =>
    apiClient.patch("/providers/me/presence", { presenceStatus, location }),

  acceptOffer: (assignmentId: string) => apiClient.post(`/assignments/${assignmentId}/accept`),
  rejectOffer: (assignmentId: string) => apiClient.post(`/assignments/${assignmentId}/reject`),

  advanceJobStatus: (assignmentId: string, status: RequestStatus) =>
    apiClient.patch(`/assignments/${assignmentId}/job-status`, { status }),
};
