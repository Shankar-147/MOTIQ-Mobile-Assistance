import { CreateServiceRequestDto } from "@motiq/types";
import { apiClient } from "./client";

export const requestApi = {
  create: (dto: CreateServiceRequestDto) => apiClient.post("/requests", dto),
  getById: (id: string) => apiClient.get(`/requests/${id}`),
  cancel: (id: string) => apiClient.patch(`/requests/${id}/cancel`),
  submitRating: (requestId: string, stars: number, comment?: string) =>
    apiClient.post(`/requests/${requestId}/ratings`, { stars, comment }),
};
