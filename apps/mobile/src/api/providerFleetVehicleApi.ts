import { CreateProviderFleetVehicleDto, UpdateProviderFleetVehicleDto } from "@motiq/types";
import { apiClient } from "./client";

/** Ch72's mobile Provider app — fleet-vehicle management in Profile, the
 * provider-side equivalent of vehicleApi.ts. */
export const providerFleetVehicleApi = {
  listMine: () => apiClient.get("/provider-fleet-vehicles"),
  create: (dto: CreateProviderFleetVehicleDto) => apiClient.post("/provider-fleet-vehicles", dto),
  update: (id: string, dto: UpdateProviderFleetVehicleDto) =>
    apiClient.patch(`/provider-fleet-vehicles/${id}`, dto),
  remove: (id: string) => apiClient.delete(`/provider-fleet-vehicles/${id}`),
};
