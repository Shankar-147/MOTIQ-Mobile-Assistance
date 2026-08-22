import { IssueType, UserRole } from "./enums";

/** Shared wire-format shapes. Validation lives server-side (class-validator, apps/api) —
 * these types describe the contract, they don't enforce it. See docs/api-conventions.md. */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface CreateServiceRequestDto {
  serviceAreaId: string;
  issueType: IssueType;
  pickupLocation: GeoPoint;
  description?: string;
  vehicleId?: string;
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
