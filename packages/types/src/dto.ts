import { IssueType } from "./enums";

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
