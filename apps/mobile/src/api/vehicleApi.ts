import { CreateMaintenanceRecordDto, CreateVehicleDto, UpdateVehicleDto, UpdateVehicleReminderSettingsDto } from "@motiq/types";
import { apiClient } from "./client";

/** Ch71's mobile Customer app — vehicle onboarding step, Profile "My
 * Vehicles" section, the Vehicle Health screen's preventive-maintenance
 * records/due-status, and the Reminder settings screen. */
export const vehicleApi = {
  listMine: () => apiClient.get("/vehicles"),
  create: (dto: CreateVehicleDto) => apiClient.post("/vehicles", dto),
  update: (id: string, dto: UpdateVehicleDto) => apiClient.patch(`/vehicles/${id}`, dto),
  remove: (id: string) => apiClient.delete(`/vehicles/${id}`),

  listMaintenanceRecords: (vehicleId: string) => apiClient.get(`/vehicles/${vehicleId}/maintenance-records`),
  addMaintenanceRecord: (vehicleId: string, dto: CreateMaintenanceRecordDto) =>
    apiClient.post(`/vehicles/${vehicleId}/maintenance-records`, dto),
  getMaintenanceDue: (vehicleId: string) => apiClient.get(`/vehicles/${vehicleId}/maintenance-due`),

  getReminderSettings: () => apiClient.get("/vehicles/reminder-preferences"),
  updateReminderSettings: (dto: UpdateVehicleReminderSettingsDto) =>
    apiClient.patch("/vehicles/reminder-preferences", dto),
};
