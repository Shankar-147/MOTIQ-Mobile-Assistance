# MOTIQ — Phased Implementation Roadmap

Companion to `docs/architecture.md`. Phases 0–3 are complete; this is the proposed sequencing for what comes next.

## Phase 0 — Architecture & Bootstrap (complete)

Environment assessment, technology stack, architecture analysis, domain model, repository structure, `CLAUDE.md`, initial config, git setup, and a working (but feature-empty) skeleton: NestJS modular monolith with real module boundaries, a Prisma schema implementing the full domain model, a fully-implemented `ServiceRequest` state machine with tests, a fully-implemented commission-split calculation with tests, a `ServiceArea` CRUD exemplar, and a Next.js Admin Console shell.

## Phase 1 — Identity & Auth (Ch33, Ch50, Ch51) (complete)

OTP-based phone login/registration for Customer/Provider (`POST /auth/otp/request`, `POST /auth/otp/verify`), password login for Admin/Support (`POST /auth/admin/login`), JWT access tokens with opaque DB-backed refresh-token rotation (`POST /auth/refresh`), and guard-based RBAC (`JwtAuthGuard` + `RolesGuard` + `@Roles(...)`) — see `docs/decisions/0011-*.md` for the full design. `RequestController.create()` now derives `customerProfileId` from the authenticated session instead of trusting client input, closing the exact gap this phase existed to close. **Not fully done**: RBAC is role-based only so far — `ServiceArea` cross-city scoping isn't enforced anywhere yet, and only `RequestController`'s read endpoint has a real ownership check. See the Reconciliation Notes below.

## Phase 2 — Core Transaction Flow (Ch52, Ch53, Ch56, Ch57) (complete)

Real Matching (candidate retrieval via `ProviderService.findNearestAvailableProvidersForRequest`, distance-sort dispatch, reassignment on rejection, timeout expiry via an Admin-triggered sweep), the deterministic Pricing Engine (Ch56, ADR 0012), and Payment settlement (ADR 0014) with a real Razorpay adapter behind `PaymentGatewayPort` and mandatory webhook signature verification. Request/Matching/Payment are wired together for real via domain events (`@nestjs/event-emitter`, ADR 0013) rather than direct module imports. Rating submission (Ch58) is also wired end-to-end, guarded and provider-derived from the accepted `Assignment`. This delivers Ch9's MVP scope minus tracking (Phase 3): request creation, matching, payment, rating.

**Not fully done**: no recurring scheduler triggers timeout reassignment (the logic is real, the trigger is manual); broadcast-to-multiple dispatch isn't implemented (single-offer only); the fare's distance input is match-time straight-line distance, not a live route; the Razorpay adapter has never been exercised against a real sandbox (no credentials in this session). See the Reconciliation Notes below.

## Phase 3 — Real-Time Tracking (Ch40, Ch54, Ch75–77) (complete)

A JWT-authenticated WebSocket gateway (`/tracking`, ADR 0015) with room-per-request fan-out, throttled and persisted location updates (`location_pings`, a TimescaleDB hypertable per Ch40), presence/heartbeat with reconnection-storm-mitigating grace periods (Ch76), and Redis-adapter horizontal scaling that degrades to single-instance if Redis isn't available (Ch75). Every accepted location update from a provider on an active job recomputes and broadcasts an ETA range — the first real implementation of ADR 0007's ETA fallback obligation.

**Not fully done**: no batching of location writes (each throttled update is its own insert); no downsampling for `location_pings` (raw-retention only); the throttle state is per-instance, not shared across a multi-instance deployment; neither TimescaleDB nor Redis has been verified against a real instance in this environment; `apps/mobile` doesn't exist yet, so the WebSocket protocol has never been exercised by a real client, only by DI-graph and unit-level checks. See the Reconciliation Notes below.

## Phase 4 — Provider Verification & Trust (Ch58, Ch98)

Real KYC workflow behind the `PROVISIONAL`/`FULLY_VERIFIED` states already modeled, ratings-driven trust score, re-verification cadence.

## Phase 5 — Notifications, Mobile Apps (Ch32, Ch59, Ch64–74)

Real SMS/push provider integration; the Flutter-vs-React-Native decision (ADR 0008) resolved and `apps/mobile` actually built.

## Phase 6 — AI Capabilities (Ch80–91)

A real provider behind the `AiCapability` interface (ADR 0007): issue classification, provider ranking, ETA prediction, the AI Assistant — each shipped only once its deterministic fallback has been proven to work without it.

## Phase 7 — Security Hardening, Observability, Compliance (Volumes IX, X, XII)

Threat modeling, encryption at rest/in transit, SLIs/SLOs, DPDP Act compliance — treated as their own phase because they cut across everything built in Phases 1–6, not because they're less important than feature work.

---

# Reconciliation Notes

Every provisional decision made in this bootstrap phase, to be revisited once the corresponding Bible volume is written at full depth or the corresponding phase above is executed:

| Decision | Where it lives | Revisit when |
|---|---|---|
| Prisma as the ORM (vs. TypeORM) | ADR 0002 | Ch38 (Logical & Physical Schema Design) is written |
| `location_pings` / TimescaleDB implemented (Phase 3, ADR 0015) but never verified against a real TimescaleDB instance; no downsampling, only raw retention | ADR 0015 | First person with a TimescaleDB-enabled Postgres instance |
| WebSocket gateway (Ch75) never exercised by a real client — `apps/mobile` doesn't exist; Redis adapter never verified against a real Redis instance | ADR 0015 | Phase 5 (`apps/mobile`), whenever Redis is available to test against |
| Location-update throttle state is per-instance (in-memory `Map`), not shared across a multi-instance deployment | ADR 0015 | Whenever the WS gateway actually runs multi-instance |
| `ServiceArea`-scoped matching-policy config is minimal (launch phase + commission + fare only, no broadcast/single-offer toggle) | ADR 0006, ADR 0013 | Ch53 or a dedicated future chapter formalizes the full config shape |
| Matching offer timeout env-configured default (90s), not yet `ServiceArea`-scoped | ADR 0004, ADR 0013, `.env.example` | Ch53 + Ch121 load testing produce a real number |
| Event backbone is in-memory only (now really implemented, ADR 0013), no real queue, no dead-letter queue | ADR 0009 | Ch101 (Cloud Architecture) picks a provider |
| No recurring scheduler for `sweepExpiredOffers()` — real logic, manual Admin-triggered endpoint only | ADR 0013 | Ch62 (Background Jobs) |
| Broadcast-to-multiple dispatch not implemented — single-offer only | ADR 0013 | Whenever a thin-supply city needs it (Ch7 §7.6.2) |
| Fare's distance input is match-time straight-line `Assignment.distanceMeters`, not a live route | ADR 0012 | Ch32 (Maps API) / Ch54 (Real-Time Tracking) |
| Surge is hardcoded to 1.00 everywhere — no demand-forecasting model to compute a real value from | ADR 0012, `docs/architecture.md` §11a | Ch86 (Demand Forecasting Model) |
| Razorpay adapter never exercised against a real sandbox — no credentials in this session | ADR 0014 | First person with real Razorpay test credentials |
| `Idempotency-Key` client header not actually implemented (Payment settlement uses a server-derived key instead) | `docs/api-conventions.md` | Whenever a second money-movement endpoint needs client-side idempotency too |
| Flutter vs. React Native undecided; `apps/mobile` empty | ADR 0008 | Ch64 (Mobile Architecture Overview) is written |
| No cloud provider chosen | `docs/architecture.md` §15 | Ch101 |
| Docker Compose provided but unverified locally (Docker not found in this environment) | `docs/development.md`, `infrastructure/README.md` | Whenever Docker is available to test against |
| No live `prisma migrate dev` has actually been run — schema, PostGIS/TimescaleDB SQL scripts, `nest build`, 51 unit tests, and a full DI-graph boot check were all validated, but not a real database round-trip (this session didn't have local Postgres credentials) | `docs/development.md` §Getting started | First person with real local DB credentials runs the documented steps |
| Prisma pinned to 5.22.x; `prisma generate` reported 7.9.1 is current | `apps/api/package.json` | Before real feature development starts — re-verify no breaking changes in the Prisma 6/7 migration guide first |
| `AdminProfile`/Admin module minimal; no verification-review or dispatch-override UI yet | `docs/domain-model.md`, Ch61 module | Phase 4 |
| No real AI provider behind `AiCapability`; all critical-path calls use their fallback | ADR 0007 | Phase 6 |
| Field-level PII encryption, MFA, WAF/DDoS config not implemented | `docs/security.md` | Phase 7 (Ch93–95) |
| Illustrative 15% commission rate used as the seed default | `prisma/seed.ts`, Ch6 §6.3.4 | Ch4's provider research produces a validated number |
| `AuditLog` wired to only two write paths (commission-rate changes, verification-status changes are the intent; only the service method exists, not yet called from every relevant path) | `apps/api/src/modules/admin` | Phase 4 |
| `ServiceArea` cross-city RBAC scoping not enforced anywhere (role-based RBAC only) | ADR 0011, `docs/architecture.md` §6 | Phase 2, whenever the first cross-city query risk actually appears |
| Ownership checks now also exist for cancel/accept/reject/job-status/rating (Phase 2), but `Payment` and `Vehicle` still have none | ADR 0011 Consequences | Phase 2+, as each remaining module gets built out |
| No cleanup job for expired `OtpChallenge`/`RefreshToken` rows | ADR 0011 Consequences | Ch62 (Background Jobs) |
| `bcryptjs` chosen over `argon2` specifically because this environment's native build toolchain was never confirmed | ADR 0011 | Ch93 (Identity & Access Security), once toolchain is confirmed |
| Guards applied per-route, not globally via `APP_GUARD` | ADR 0011 | Revisit once the number of protected routes grows past what's easy to eyeball |
