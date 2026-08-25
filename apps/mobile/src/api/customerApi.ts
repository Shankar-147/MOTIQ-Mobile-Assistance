import { apiClient } from "./client";

export interface UpdateCustomerProfileInput {
  displayName?: string;
  preferredLanguage?: string;
  defaultServiceAreaId?: string;
}

/** Ch71's mobile Customer app Profile screen. */
export const customerApi = {
  getOwnProfile: () => apiClient.get("/customers/me"),
  updateOwnProfile: (dto: UpdateCustomerProfileInput) => apiClient.patch("/customers/me", dto),
};
