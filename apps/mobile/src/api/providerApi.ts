import { GeoPoint, PresenceStatus, RequestStatus, VerificationDocumentType } from "@motiq/types";
import { apiClient } from "./client";

export const providerApi = {
  updatePresence: (presenceStatus: PresenceStatus, location?: GeoPoint) =>
    apiClient.patch("/providers/me/presence", { presenceStatus, location }),

  acceptOffer: (assignmentId: string) => apiClient.post(`/assignments/${assignmentId}/accept`),
  rejectOffer: (assignmentId: string) => apiClient.post(`/assignments/${assignmentId}/reject`),

  advanceJobStatus: (assignmentId: string, status: RequestStatus) =>
    apiClient.patch(`/assignments/${assignmentId}/job-status`, { status }),

  /** Ch72's mobile Home/Profile screens — a provider reading their own tier/stats. */
  getOwnProfile: () => apiClient.get("/providers/me"),

  /** Ch71's mobile Customer app tracking screen — a non-sensitive slice of
   * the assigned provider's profile (businessName, rating, tier). */
  getPublicProfile: (providerProfileId: string) => apiClient.get(`/providers/${providerProfileId}/public`),

  /** Ch72's mobile job-history screen — cursor-paginated, see docs/api-conventions.md. */
  listOwnJobs: (params?: { cursor?: string; limit?: number }) =>
    apiClient.get("/providers/me/jobs", { params }),

  submitVerificationDocument: (documentType: VerificationDocumentType, fileUrl: string) =>
    apiClient.post("/providers/me/verification-documents", { documentType, fileUrl }),

  listVerificationDocuments: () => apiClient.get("/providers/me/verification-documents"),
};
