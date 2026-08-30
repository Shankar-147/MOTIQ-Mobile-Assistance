/**
 * Canonical enums shared across apps/api and apps/web.
 * These mirror docs/domain-model.md and apps/api/prisma/schema.prisma exactly.
 * Changing a value here without updating both is a bug — see CLAUDE.md's
 * "no duplicated business logic" rule; this package exists specifically to
 * prevent this vocabulary from drifting between backend and frontend.
 */

/** Ch2 §2.4.2 — binding, verbatim breakdown taxonomy. Do not invent a different list. */
export enum IssueType {
  TOW = "TOW",
  REPAIR = "REPAIR",
  FUEL = "FUEL",
  FLAT_TYRE = "FLAT_TYRE",
  BATTERY_JUMP = "BATTERY_JUMP",
  OTHER = "OTHER",
}

/** Ch19 — the canonical Service Request state machine. See ADR 0004. */
export enum RequestStatus {
  REQUESTED = "REQUESTED",
  MATCHING = "MATCHING",
  ASSIGNED = "ASSIGNED",
  PROVIDER_ACCEPTED = "PROVIDER_ACCEPTED",
  PROVIDER_EN_ROUTE = "PROVIDER_EN_ROUTE",
  ARRIVED = "ARRIVED",
  SERVICE_IN_PROGRESS = "SERVICE_IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED_BY_CUSTOMER = "CANCELLED_BY_CUSTOMER",
  CANCELLED_BY_PROVIDER = "CANCELLED_BY_PROVIDER",
  EXPIRED = "EXPIRED",
  FAILED = "FAILED",
}

/** A separate state machine from RequestStatus — see ADR 0004's "why separate" note. */
export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/** Ch98 — never a boolean. See ADR 0005. */
export enum ProviderVerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PROVISIONAL = "PROVISIONAL",
  FULLY_VERIFIED = "FULLY_VERIFIED",
  SUSPENDED = "SUSPENDED",
  DELISTED = "DELISTED",
}

export enum PresenceStatus {
  OFFLINE = "OFFLINE",
  ONLINE = "ONLINE",
  BUSY = "BUSY",
}

export enum AssignmentStatus {
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  TIMED_OUT = "TIMED_OUT",
  /** Ch61's admin manual dispatch override superseded this OFFERED
   * assignment with a hand-picked provider. */
  SUPERSEDED = "SUPERSEDED",
}

/** Ch7 §7.6.2 — the four-phase cold-start playbook. */
export enum ServiceAreaLaunchPhase {
  SUPPLY_SEEDING = "SUPPLY_SEEDING",
  CONTROLLED_DEMAND = "CONTROLLED_DEMAND",
  LIQUIDITY_GROWTH = "LIQUIDITY_GROWTH",
  STEADY_STATE = "STEADY_STATE",
}

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  PROVIDER = "PROVIDER",
  ADMIN = "ADMIN",
  SUPPORT = "SUPPORT",
}

export enum VehicleType {
  TWO_WHEELER = "TWO_WHEELER",
  CAR = "CAR",
  COMMERCIAL = "COMMERCIAL",
}

export enum NotificationChannel {
  PUSH = "PUSH",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

/** Ch79 — SOS/safety notifications are always CRITICAL, never best-effort. */
export enum NotificationDeliveryTier {
  CRITICAL = "CRITICAL",
  BEST_EFFORT = "BEST_EFFORT",
}

/** Ch98 — KYC document submission types. */
export enum VerificationDocumentType {
  DRIVING_LICENSE = "DRIVING_LICENSE",
  VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
  IDENTITY_PROOF = "IDENTITY_PROOF",
  ADDRESS_PROOF = "ADDRESS_PROOF",
  OTHER = "OTHER",
}

export enum VerificationDocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/** Ch70 — mobile push device registration. */
export enum DevicePlatform {
  IOS = "IOS",
  ANDROID = "ANDROID",
}

/** Ch128 — explicit, versioned consent required before location collection begins. */
export enum ConsentType {
  LOCATION_TRACKING = "LOCATION_TRACKING",
}

/** Ch55 — the platform's highest-priority path. */
export enum SosAlertStatus {
  TRIGGERED = "TRIGGERED",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
  FALSE_ALARM = "FALSE_ALARM",
}

/** Why a ProviderTrustSnapshot row was written — the two (and only two)
 * events that ever change ProviderProfile.trustScore. */
export enum TrustSnapshotReason {
  RATING_SUBMITTED = "RATING_SUBMITTED",
  VERIFICATION_TRANSITION = "VERIFICATION_TRANSITION",
}

/** Preventive-maintenance service categories a customer can log against a Vehicle. */
export enum MaintenanceServiceType {
  OIL_CHANGE = "OIL_CHANGE",
  TIRE_ROTATION = "TIRE_ROTATION",
  BRAKE_SERVICE = "BRAKE_SERVICE",
  BATTERY_CHECK = "BATTERY_CHECK",
  GENERAL_SERVICE = "GENERAL_SERVICE",
  ENGINE_CHECK = "ENGINE_CHECK",
  COOLANT_CHECK = "COOLANT_CHECK",
  AIR_FILTER = "AIR_FILTER",
  LIGHTS_CHECK = "LIGHTS_CHECK",
  OVERALL_HEALTH_CHECK = "OVERALL_HEALTH_CHECK",
  OTHER = "OTHER",
}

/** A vehicle's due-status for one MaintenanceServiceType, derived from its
 * service history against MaintenanceIntervalRule — computed on read for
 * display, but also persisted in VehicleMaintenanceReminderLog as a
 * point-in-time dedup record for the reminder scheduler. */
export enum MaintenanceDueStatus {
  NOT_TRACKED = "NOT_TRACKED",
  OK = "OK",
  DUE_SOON = "DUE_SOON",
  OVERDUE = "OVERDUE",
}
