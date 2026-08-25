import { CreateServiceRequestDto } from "@motiq/types";
import { apiClient } from "./client";

export const requestApi = {
  create: (dto: CreateServiceRequestDto) => apiClient.post("/requests", dto),
  getById: (id: string) => apiClient.get(`/requests/${id}`),
  getPayment: (id: string) => apiClient.get(`/requests/${id}/payment`),
  cancel: (id: string) => apiClient.patch(`/requests/${id}/cancel`),
  submitRating: (requestId: string, stars: number, comment?: string) =>
    apiClient.post(`/requests/${requestId}/ratings`, { stars, comment }),
  /** Ch71's mobile History screen — cursor-paginated, see docs/api-conventions.md. */
  listMine: (params?: { cursor?: string; limit?: number }) =>
    apiClient.get("/requests", { params }),
};
