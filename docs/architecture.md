# MOTIQ Architecture

> **This document anticipates Volume III (System Architecture & Design Decisions), Chapters 25–36 of the MOTIQ Engineering Bible**, currently present only as condensed reference entries (`docs/handbook/volumes-02-to-14-condensed-reference.md`). Where this document makes a call already stated as binding in those condensed chapters, it says so. Where it makes a genuinely open call, it's recorded as a Provisional ADR in `docs/decisions/` and should be reconciled when Volume III is written at full depth. See `docs/handbook/README.md` for how the handbook and this repository relate.

## 1. System architecture

MOTIQ is a **modular monolith** (ADR 0001, confirmed by Ch25): one NestJS backend (`apps/api`) internally partitioned into modules matching Ch24's bounded contexts — Identity, ServiceArea, Provider, Request, Matching, Payment, Notification, Rating, Admin. No module reaches into another's data layer directly; cross-module calls go through exported service interfaces only. This buys most of microservices' separation-of-concerns benefit without its operational cost, matching the team's actual size (3-person founding team, per Ch10) and matching the fact that no part of the system has yet demonstrated an independent-scaling or team-ownership pressure (Ch27's stated trigger for extraction).

Two client applications are anticipated: a Next.js **Admin & Operations Console** (`apps/web`, Ch137) for internal ops/support staff, and Customer/Provider **mobile apps** (`apps/mobile`, Volume VI) — see ADR 0008 for why these are different apps, not one web app, and the discrepancy this corrects relative to the master bootstrap prompt's generic "Next.js frontend" direction.

## 2. Frontend architecture

- **`apps/web` (Admin & Operations Console).** Next.js, TypeScript, Tailwind CSS. Talks to `apps/api`'s `/api/v1` REST surface. Scoped to Ch137's responsibilities: provider-verification review queue, manual dispatch override, service-area/commission configuration. Not the customer-facing product.
- **`apps/mobile` (Customer + Provider apps).** Placeholder only in this phase. Framework (Flutter vs. React Native) is explicitly left open pending Ch64 — see ADR 0008's consequences section for the tradeoff (React Native could share `packages/types` directly; Flutter could not).

## 3. Backend architecture

NestJS, TypeScript, layered `controller → service → repository` per module (Ch48, Ch49). DTOs validated with `class-validator` at the controller boundary; a global exception filter maps domain errors to the Ch29 RFC-7807-style error envelope (`type, title, status, detail, instance`). Business logic lives in services, never in controllers or DTOs (master prompt's core convention, reinforced by Ch48's layering rule).

Synchronous vs. asynchronous split (Ch30): auth, request-creation acknowledgment, and payment confirmation are synchronous REST calls; matching, notification fan-out, and analytics ingestion go through the event backbone (Ch31, ADR 0009). The event catalog's minimum set — `RequestCreated`, `ProviderAssigned`, `ProviderTimedOut`, `PaymentSettled`, `JobCompleted`, `RatingSubmitted` — is implemented now behind a `DomainEventPublisher`/`DomainEventConsumer` interface with an in-memory adapter; the production transport (managed queue vs. self-hosted) is deferred to ADR 0009 pending a cloud-provider choice (Ch101).

## 4. Database architecture

PostgreSQL + Prisma (ADR 0002). Geospatial columns (`Provider.location`, `ServiceRequest.pickupLocation`) are PostGIS `geography(Point, 4326)` with a GiST index — plain lat/lng columns are disallowed for any nearest-provider query path (Ch39, non-negotiable). Nearest-provider lookups go through raw SQL (`$queryRaw` with `ST_DWithin`/`ST_Distance`) in the Provider/Matching repositories — the one deliberate escape hatch from "no raw SQL in domain code." Enums are Postgres enums, not free-text status columns (Ch38). Money is `Decimal`, never `Float` (Ch14). Ch40's TimescaleDB requirement for raw GPS ping history is explicitly **not** implemented in this phase — see Reconciliation Notes.

## 5. Authentication architecture

**Implemented as of Phase 1** — see `docs/decisions/0011-*.md` for the full reasoning. JWT access tokens (short-lived, 15m default) with **opaque, DB-backed, hashed refresh tokens** that rotate on every use (Ch33) — not JWT refresh tokens, since those can't be revoked without a blocklist. Four roles modeled as a real Postgres enum with distinct permission sets — `CUSTOMER`, `PROVIDER`, `ADMIN`, `SUPPORT` — not a shared "user" role with ad hoc flags (Ch33's explicit prohibition). OTP-based phone-first login/registration is the primary flow for Customer/Provider (Ch50: `POST /api/v1/auth/otp/request`, `POST /api/v1/auth/otp/verify`), reflecting the Indian market context Ch2/Ch16 describe — no real SMS provider is wired yet (Ch32), so the code is logged loudly instead of sent. Admin/Support use password login (`POST /api/v1/auth/admin/login`) with `bcryptjs` hashing; those accounts are never self-registered, only provisioned out of band (`prisma/seed.ts` in this bootstrap phase).

## 6. Authorization / RBAC architecture

**Implemented as of Phase 1.** Guard-level enforcement at the controller layer — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`, applied per-route rather than globally (see ADR 0011 for why). `RequestController` is the first data-access-layer example: a `CUSTOMER` caller can only read their own `ServiceRequest`s (`request.customerProfileId === user.profileId`), checked after the DB read, not just role-gated at the door. **`ServiceArea` scoping is not yet enforced anywhere** (Section 8's "city A's data must not be satisfiable from city B's session" rule) — no endpoint yet does a cross-city query that would expose the gap, but this is real, tracked debt, not an oversight — see `docs/roadmap.md`'s Reconciliation Notes.

## 7. Location / geospatial architecture

See Section 4. Additionally: geofencing (arrival detection at a job site, future SOS zones) is modeled as PostGIS polygons, not manual radius math in application code (Ch39). This bootstrap phase implements the column types and indexes but not the geofencing logic itself (that's Ch54's Real-Time Tracking Service, out of scope per Section 12 of the master prompt).

## 8. Service area / cold-start architecture

`ServiceArea` is a first-class entity (ADR 0006), not a string field — it carries a `launchPhase` (Ch7's four phases: `SUPPLY_SEEDING, CONTROLLED_DEMAND, LIQUIDITY_GROWTH, STEADY_STATE`), a geographic boundary, and owns the `CommissionRate` (Section 9) and matching-policy config for that city. Every `Provider` and `ServiceRequest` belongs to exactly one `ServiceArea`; matching only considers providers in the same area.

## 9. Service request lifecycle

Canonical states (Ch19, confirmed, matches the master prompt's Section 7 exactly): `REQUESTED → MATCHING → ASSIGNED → PROVIDER_ACCEPTED → PROVIDER_EN_ROUTE → ARRIVED → SERVICE_IN_PROGRESS → COMPLETED`, plus `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_PROVIDER`, `EXPIRED`, `FAILED`. All transitions are enforced through one guarded state-machine function (ADR 0004) — never a raw status update from elsewhere. Payment status is a **separate** state machine (`PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED`) linked to, not embedded in, the request state — a job can be `COMPLETED` while payment is still settling.

**Implemented as of Phase 2** (ADR 0013): `RequestCreated`/`RequestCompleted` domain events (in-process, `@nestjs/event-emitter`) drive `REQUESTED → MATCHING` dispatch and Payment settlement without `RequestModule` importing `MatchingModule`/`PaymentModule`. Matching timeout (`MATCHING_OFFER_TIMEOUT_SECONDS`, provisional default 90s) is env-configured, not yet `ServiceArea`-scoped as originally planned (ADR 0006's matching-policy config remains minimal — see Reconciliation Notes); broadcast-vs-single-offer dispatch is **not implemented** — single-offer only in this phase. Timeout expiry (`MatchingService.sweepExpiredOffers()`) is real logic with no recurring trigger yet — an Admin-only endpoint stands in for Ch62's future scheduler.

## 10. Notification architecture

Multi-channel abstraction (push/SMS/email) behind one `NotificationService` interface (Ch59), with delivery-guarantee tiers — SOS and safety-critical notifications are "critical" tier (never silently dropped), most others "best-effort" (Ch79). Implemented in this phase as an interface with a console/log adapter only; real provider integration (Ch32's SMS/push vendor) is out of scope for this bootstrap.

## 11. Payment architecture

Every `Payment` record stores `totalAmount`, `commissionAmount`, and `providerPayoutAmount` as three separate, auditable columns (ADR 0003, binding per Ch6 and Ch57) — never derived-on-read. The commission rate itself is a versioned, `ServiceArea`-scoped configuration value (`CommissionRate` table), never a code constant or bare env var, so a city's rate can change (including Ch7's cold-start zero/reduced-commission period) without a deploy, and every historical payment stays reconstructable against the rate that actually produced it. Idempotency keys (Ch43) are required on payment-intent creation.

**Implemented as of Phase 2** (ADR 0014): settlement is automatic on `RequestCompleted` — fare is computed via the Pricing Engine (§11a below) and split via `calculateCommissionSplit()`, idempotent per request (`settle:${serviceRequestId}`). A Razorpay adapter (`RazorpayGatewayAdapter`, behind `PaymentGatewayPort`, Ch32) creates a real order when `RAZORPAY_KEY_ID`/`SECRET` are configured — they aren't in this environment, so `Payment` settles `PENDING` with no `gatewayReference`, logged loudly rather than silently. Webhook signature verification (`POST /payments/webhooks/razorpay`) is mandatory and implemented against `req.rawBody` (Ch57) — **not exercised against a real Razorpay sandbox**, since no credentials were available in this session.

### 11a. Pricing architecture (Ch8, Ch56 — implemented as of Phase 2, ADR 0012)

`calculateFare()` is a pure function (`baseFare + distanceComponent) × surgeMultiplier − promotionDiscount`, returning every line item separately — never collapsed into one number, satisfying Ch8's "must be individually visible" requirement structurally. `FareConfig` is `ServiceArea`-scoped and versioned, same pattern as `CommissionRate`. Surge is hardcoded to `1.00` in every call site — there's no demand-forecasting model (Ch86) to compute a real value from yet; the cap-enforcement code (`SurgeCapExceededError`) is real and tested regardless. The distance input is the accepted `Assignment`'s match-time straight-line distance (§9), not a live route — Ch32/Ch54 route distance is future work.

## 12. AI integration architecture

AI is a pluggable capability behind an `AiCapability` interface (ADR 0007, confirmed per Ch1 §1.6.2/§1.8, Ch35, Ch90), not a service any critical-path code depends on directly. Every critical-path call site (issue classification, provider ranking, ETA) has a deterministic non-AI fallback as its designed default, not an error-handler afterthought: category defaults to `OTHER` pending manual selection, ranking falls back to distance-sort, ETA falls back to a route-distance estimate shown with an explicit uncertainty range. The SOS path never goes through this interface at all — wired directly, so no future AI change can sit in front of it. No concrete AI provider is implemented in this bootstrap phase.

## 13. Observability

Structured logging (JSON, correlation-ID per request) from the first module onward, per the master prompt's Section 2 principle 10 and anticipating Ch110/Ch111. Full OpenTelemetry tracing, SLIs/SLOs (Ch109), and dashboards are out of scope for this phase but the correlation-ID convention is established now so it doesn't need retrofitting.

## 14. Testing strategy

Unit tests for domain logic (state machine transitions, fare calculation, commission split) from the first module onward, per the master prompt's principle 12. Full test-pyramid tooling and CI gating (Ch118–121) are anticipated but not built out in this bootstrap phase beyond a working Jest setup.

## 15. Deployment strategy

Docker Compose for local development (`infrastructure/docker-compose.yml`: Postgres+PostGIS, Redis) — **unverified in this environment**, since Docker was not found installed during the environment assessment; PostgreSQL 18 is already installed and running natively, so native local development is the currently-working path (see `docs/development.md`). No cloud provider is chosen in this phase (Ch101 not yet written; avoiding premature lock-in per the master prompt's Section 4.5).

## 16. Security architecture

See `docs/security.md`.

## 17. Scalability considerations

The modular monolith (Section 1) is deliberately not yet scaled — Ch27's extraction roadmap names Matching as the first candidate for extraction, triggered by a real team-ownership conflict, independent-scaling need, or deployment-blast-radius incident, not extracted speculatively. Redis caching (Ch44) is scoped narrowly for now: provider-availability lookups only, with short TTL and explicit invalidation on status change — never a stale-tolerant long TTL, since it directly affects matching correctness. Not implemented in this bootstrap phase; scoped here for when it's built.

## 18. Failure scenarios

- **AI unavailable:** falls back to deterministic logic per Section 12 — never blocks the critical path.
- **Matching model unavailable:** falls back to distance-sort (Ch35, non-negotiable).
- **No provider available in a `ServiceArea`:** the request transitions to `EXPIRED` after the configured matching window; the actual UX for this moment is Ch135's job, out of scope here, but the state machine (Section 9) already has a defined terminal state for it.
- **Payment gateway down:** the job can still be `COMPLETED` while payment stays `PENDING`/retrying, because payment status is modeled separately (Section 9) — the driver isn't left in matching limbo over a gateway blip.

## 19. Future mobile-application compatibility

`packages/types` centralizes shared enums/DTOs (breakdown taxonomy, `RequestStatus`, `ProviderVerificationStatus`) so the API contract has one source of truth. If React Native is chosen for `apps/mobile` (Ch64), this package is directly consumable. If Flutter is chosen, a Dart-side equivalent or schema-driven codegen (from the Prisma schema or a generated OpenAPI spec) would be needed — flagged in ADR 0008, not resolved here.
