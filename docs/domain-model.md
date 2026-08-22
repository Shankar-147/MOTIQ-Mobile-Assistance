# MOTIQ Domain Model

This is the conceptual model implemented by `apps/api/prisma/schema.prisma`. Naming here is binding for code/schema per Ch23's Domain Glossary rule — deviations require an ADR. Relationships, not just fields, are the point: see each entity's "Why" note for the reasoning that shaped it.

## Core entities

### User
The authentication identity, independent of role-specific data. Holds `phone` (primary login identifier, per Ch50's phone-first OTP flow), optional `email`, `passwordHash` (Admin/Support only — Customer/Provider auth is OTP-based), `role` (`CUSTOMER | PROVIDER | ADMIN | SUPPORT`, Ch33), and account status.

**Why a single User table with role-specific profile tables, not three separate identity tables:** authentication (phone/OTP, tokens, sessions) is genuinely shared machinery across all three actor types; the *permissions and data* attached to each role are not. Ch33's "no shared user role with ad hoc flags" is about authorization enforcement (guards checking `role`), not about the login/identity table's shape.

### CustomerProfile
1:1 with `User` where `role = CUSTOMER`. Display name, preferred language (English/Hindi/Tamil, per Ch16), default `serviceAreaId` (last-known city, a convenience, not an access boundary).

### ProviderProfile
1:1 with `User` where `role = PROVIDER`. Business/individual name, `serviceAreaId` (the one city this provider operates in — see ADR 0006), `verificationStatus` (`UNVERIFIED | PROVISIONAL | FULLY_VERIFIED | SUSPENDED | DELISTED` — **never a boolean**, ADR 0005/Ch98, transitions guarded by a state machine as of Phase 4, ADR 0016), `lastVerifiedAt` (when the current tier was granted — starts the Ch98 re-verification clock), `currentLocation` (PostGIS `geography(Point,4326)`, nullable when offline), `presenceStatus` (`OFFLINE | ONLINE | BUSY`), `lastSeenAt`, `ratingAverage`/`completedJobCount` (denormalized read-models fed by `Rating`, per Ch58), and `trustScore` (Ch58 — a Bayesian-adjusted, verification-weighted score, deliberately distinct from raw `ratingAverage`; see ADR 0016).

**Why `presenceStatus`/`currentLocation` live here rather than a separate `Availability` table:** at this phase's scope, presence is a single current-state fact per provider, not a scheduled-windows concept. Ch76 (Presence & Connection State Management) owns the real heartbeat/reconnection-storm design later; this is a deliberately minimal placeholder for that, not a final answer — noted in Reconciliation Notes.

### ProviderVerificationDocument
Ch98's KYC submission (implemented Phase 4, ADR 0016). `providerProfileId`, `documentType` (`DRIVING_LICENSE | VEHICLE_REGISTRATION | IDENTITY_PROOF | ADDRESS_PROOF | OTHER` — this bootstrap phase's own taxonomy, Ch98 hasn't specified one), `fileUrl` (a client-supplied reference — no real file storage/scanning integration exists), `status` (`PENDING | APPROVED | REJECTED`), `reviewedByUserId`/`reviewNotes`/`reviewedAt`. Reviewing a document does **not** automatically change the provider's overall `verificationStatus` — that's a separate, explicit admin action (see ADR 0016's reasoning).

### AdminProfile
1:1 with `User` where `role` is `ADMIN` or `SUPPORT`. Minimal in this phase (department/notes) — Ch61's Admin & Operations Service will extend this. `mfaSecret`/`mfaEnabled` (Phase 7, Ch93) — opt-in TOTP; `mfaEnabled` only flips true once enrollment is confirmed with a real generated code.

### Vehicle
Belongs to a `CustomerProfile`. `vehicleType` (`TWO_WHEELER | CAR | COMMERCIAL`), make, model, year, plate number.

### ProviderFleetVehicle
Belongs to a `ProviderProfile`. **Deliberately a distinct entity from `Vehicle`** — Ch37 flags this exact naming collision in the original V0 ER model and requires the rename: a provider's tow truck is not the same concept as a customer's car, even though both are "vehicles" in casual language.

### ServiceArea
First-class city/launch-region entity (ADR 0006). `name`, `boundary` (PostGIS `geography(Polygon,4326)`), `launchPhase` (`SUPPLY_SEEDING | CONTROLLED_DEMAND | LIQUIDITY_GROWTH | STEADY_STATE`, Ch7 §7.6.2). Owns `CommissionRate` rows and (future) matching-policy config. Every `ProviderProfile` and `ServiceRequest` belongs to exactly one `ServiceArea`; matching only considers same-area providers.

### ServiceRequest
The core transactional entity. `customerId`, `serviceAreaId`, `issueType` (`TOW | REPAIR | FUEL | FLAT_TYRE | BATTERY_JUMP | OTHER` — Ch2 §2.4.2, verbatim, binding), `status` (Ch19's state machine — see below), `pickupLocation` (PostGIS point), free-text `description`, and a **vehicle snapshot** (`vehicleSnapshotMake/Model/Year/PlateNumber`, copied at request-creation time) plus a nullable `vehicleId` reference for traceability.

**Why a snapshot instead of just a live FK to `Vehicle`:** the master prompt's own domain-model note applies directly — a request must not silently change if the customer edits their vehicle details later. The FK is kept too, for analytics/traceability, but the fields actually shown on a historical request are the snapshot, not a live join.

`status` values: `REQUESTED, MATCHING, ASSIGNED, PROVIDER_ACCEPTED, PROVIDER_EN_ROUTE, ARRIVED, SERVICE_IN_PROGRESS, COMPLETED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_PROVIDER, EXPIRED, FAILED` (Ch19, confirmed — see ADR 0004). All transitions go through one guarded function; nothing else writes this column directly.

### Assignment
Represents one offer of a `ServiceRequest` to one `ProviderProfile` — there can be several per request (sequential offers, or simultaneous broadcast, per Ch53's per-`ServiceArea` config). `status` (`OFFERED | ACCEPTED | REJECTED | TIMED_OUT`), `offeredAt`, `respondedAt`, a `version` column for optimistic locking (Ch43 — prevents two concurrent processes from double-assigning the same request), and `providerVerificationStatusAtAssignment` — a **point-in-time snapshot** of the provider's verification tier when the offer was made, because Ch1 §1.6.2's Safety success layer tracks "percentage of completed jobs performed by a fully-verified provider" as a historical fact that must not change if the provider's status changes later (see ADR 0005). `distanceMeters` — the straight-line PostGIS distance from provider to pickup, captured once at offer time; reused as the Pricing Engine's distance input when the job completes, since no route/tracking distance source exists yet (ADR 0012).

### CommissionRate
Belongs to a `ServiceArea`. `ratePercentage` (Decimal), `effectiveFrom` (timestamp). Versioned, not a single mutable value — Ch7's cold-start reduced/zero-commission period and Ch34's "commission is configuration, not a code constant" rule both require this (ADR 0003).

### FareConfig
Belongs to a `ServiceArea`. `baseFare`, `perKmRate`, `maxSurgeMultiplier` (Decimals), `effectiveFrom` (timestamp) — versioned, same pattern and reasoning as `CommissionRate` (ADR 0012). Feeds `calculateFare()`, which returns every line item (base, distance, surge, promotion) separately, never collapsed, per Ch8's visibility requirement.

### Payment
1:1 with a completed `ServiceRequest`. `totalAmount`, `commissionAmount`, `providerPayoutAmount` — **three separate Decimal columns**, always `totalAmount = commissionAmount + providerPayoutAmount`, never derived-on-read (Ch6, Ch57, binding). FK to the `CommissionRate` row that produced the split (auditability). `status` (`PENDING | AUTHORIZED | CAPTURED | FAILED | REFUNDED`) — a **separate state machine from `ServiceRequest.status`** (ADR 0004): a job can be `COMPLETED` while payment is still `PENDING`. `idempotencyKey` (unique, Ch43).

### Rating
1:1 with a completed `ServiceRequest`. `stars` (1–5), optional `comment`, FKs to both the rating customer and the rated provider. Feeds `ProviderProfile.ratingAverage` (Ch58) and, later, Ch84's ranking model.

### Notification
`userId`, `channel` (`PUSH | SMS | EMAIL`), `category`, `deliveryTier` (`CRITICAL | BEST_EFFORT` — Ch79: SOS/safety notifications are never best-effort), `payload` (JSON), `status` (`QUEUED | SENT | FAILED | SUPPRESSED` — `SUPPRESSED` added Phase 5, ADR 0017, for a preference/quiet-hours-blocked `BEST_EFFORT` send), `sentAt`. Real Twilio/FCM delivery as of Phase 5 (ADR 0017); OTP delivery bypasses this entity entirely (see `NotificationService.sendOtpSms()`'s doc comment for why).

### PushDeviceToken
Ch70, Phase 5. `userId`, `token` (unique — upserted, not duplicated, on re-registration), `platform` (`IOS | ANDROID`), `lastSeenAt`. A user can have more than one (phone + tablet); `NotificationService` fans a push out to all of a user's tokens.

### NotificationPreference
Ch59, Phase 5. 1:1 with `User`, created lazily on first read/write. `smsEnabled`/`pushEnabled`/`emailEnabled` (Boolean), `quietHoursStartHour`/`quietHoursEndHour` (nullable local-hour-of-day integers, wrapping past midnight). Never suppresses `CRITICAL`-tier sends (Ch79) — see `notification-preference.util.ts`.

### AuditLog
`actorUserId` (nullable — some actions are system-initiated), `action`, `entityType`, `entityId`, `metadata` (JSON), `createdAt`. Exists from day one per the master prompt's security principles and Ch61/Ch99's fraud/ops posture, even though this bootstrap phase only wires it to a small number of write paths (commission-rate changes, verification-status changes).

### AiConversation / AiConversationMessage
Ch90, Phase 6. `AiConversation`: `userId`, `emergencyDetected`/`escalated` (Booleans — a real future review process, Ch91, can query which conversations left the assistant's normal path), `estimatedCostUsd` (Decimal, cumulative — Ch90's binding cost-per-conversation cap, see `ai-cost.util.ts`). `AiConversationMessage`: `conversationId`, `role` (`USER | ASSISTANT`), `content`. See ADR 0019 for what this assistant can and can't do (notably: it cannot redirect to a real SOS path, because Ch55 doesn't exist).

### LocationPing
Ch40's raw GPS trail store (implemented Phase 3, ADR 0015). `providerProfileId`, `latitude`/`longitude` (plain Floats, deliberately not PostGIS geography — see ADR 0015's "why not geography" note), `recordedAt`. Composite `(id, recordedAt)` primary key, not a plain single-column one, because TimescaleDB requires any unique/PK constraint on a hypertable to include the partitioning column. Written by `TrackingService` on every accepted (throttled) location update from a provider. `flaggedAsSuspicious` (Boolean, Phase 7, Ch99) — set when `gps-spoof.util.ts` detects a physically-implausible speed since the provider's previous ping; advisory only, never blocks the write.

### ConsentRecord
Ch128, Phase 7. `userId`, `consentType` (`LOCATION_TRACKING` today), `version` (Int — a future consent-copy change bumps this, requiring re-grant without deleting history), `grantedAt`, `revokedAt`. Gates `RequestController.create()` and `ProviderController.updateOwnPresence()` (when it carries a location) via `ConsentService.requireConsent()`.

## Deliberately out of scope for this phase (see Reconciliation Notes)

- **SOS/emergency entities** (Ch55) — safety-critical path, needs its own dedicated design, not bootstrapped speculatively.
- **Chat messages** (Ch78) — in-app chat is a Volume VII concern, not core-transaction-critical.

## Relationship summary

```
User 1—1 CustomerProfile 1—* Vehicle
User 1—1 ProviderProfile *—1 ServiceArea
User 1—1 ProviderProfile 1—* ProviderFleetVehicle
ServiceArea 1—* CommissionRate
ServiceArea 1—* FareConfig
ServiceArea 1—* ServiceRequest
ServiceArea 1—* ProviderProfile
CustomerProfile 1—* ServiceRequest
ServiceRequest *—1 Vehicle (nullable, traceability only — see snapshot note)
ServiceRequest 1—* Assignment *—1 ProviderProfile
ProviderProfile 1—* LocationPing
ProviderProfile 1—* ProviderVerificationDocument *—1 User (reviewedByUser, nullable)
ServiceRequest 1—1 Payment *—1 CommissionRate
ServiceRequest 1—1 Rating
```
