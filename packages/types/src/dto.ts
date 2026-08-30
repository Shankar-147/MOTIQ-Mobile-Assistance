import { IssueType, MaintenanceDueStatus, MaintenanceServiceType, UserRole, VehicleType } from "./enums";

/** Shared wire-format shapes. Validation lives server-side (class-validator, apps/api) —
 * these types describe the contract, they don't enforce it. See docs/api-conventions.md. */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface CreateServiceRequestDto {
  // serviceAreaId is deliberately NOT a field here — it's derived server-side
  // from pickupLocation (ServiceAreaService.resolveForPoint), never trusted
  // from the client. See CLAUDE.md rule 8 / ADR 0006.
  issueType: IssueType;
  pickupLocation: GeoPoint;
  description?: string;
  vehicleId?: string;
}

export interface CreateVehicleDto {
  vehicleType: VehicleType;
  make: string;
  model: string;
  year?: number;
  plateNumber: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

export interface VehicleDto extends CreateVehicleDto {
  id: string;
  customerProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderFleetVehicleDto {
  vehicleType: VehicleType;
  make: string;
  model: string;
  plateNumber: string;
}

export interface UpdateProviderFleetVehicleDto extends Partial<CreateProviderFleetVehicleDto> {}

export interface ProviderFleetVehicleDto extends CreateProviderFleetVehicleDto {
  id: string;
  providerProfileId: string;
  createdAt: string;
}

export interface CreateMaintenanceRecordDto {
  serviceType: MaintenanceServiceType;
  odometerKm: number;
  cost?: string;
  notes?: string;
}

export interface VehicleMaintenanceRecordDto extends CreateMaintenanceRecordDto {
  id: string;
  vehicleId: string;
  servicedAt: string;
  createdAt: string;
}

/** One row per MaintenanceServiceType a vehicle's type has a rule for —
 * see VehicleService.getMaintenanceDueStatus() / maintenance-due.util.ts. */
export interface MaintenanceDueStatusDto {
  serviceType: MaintenanceServiceType;
  status: MaintenanceDueStatus;
  lastServicedAt: string | null;
  lastOdometerKm: number | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  kmSinceService: number | null;
  monthsSinceService: number | null;
}

export interface VehicleReminderPreferenceDto {
  serviceType: MaintenanceServiceType;
  enabled: boolean;
}

export interface VehicleReminderSettingsDto {
  preferences: VehicleReminderPreferenceDto[];
  leadTimeDays: number;
}

export interface UpdateVehicleReminderSettingsDto {
  preferences: VehicleReminderPreferenceDto[];
  leadTimeDays: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    limit: number;
  };
}

/** Mirrors the RFC 7807-style error envelope — see docs/api-conventions.md. */
export interface ApiErrorEnvelope {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

/**
 * Ch33/Ch50/Ch51 — Auth wire shapes. See docs/decisions/0011-*.md.
 * Registration (a phone with no existing User) requires the role-specific
 * fields below; login (existing phone) ignores them.
 */
export interface RequestOtpRequest {
  phone: string;
  // OTP delivery channel (phone stays the account identity) — see
  // apps/api's RequestOtpDto doc comment.
  email: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  role?: UserRole.CUSTOMER | UserRole.PROVIDER;
  displayName?: string; // customer registration
  businessName?: string; // provider registration
  serviceAreaId?: string; // provider registration
}

export interface AdminLoginRequest {
  identifier: string; // phone or email
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds, access token TTL
}

/** The shape attached to req.user after JwtAuthGuard runs. */
export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  /** customerProfileId | providerProfileId | adminProfileId, depending on role. */
  profileId: string;
}
