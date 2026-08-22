# MOTIQ — Phased Implementation Roadmap

Companion to `docs/architecture.md`. Phases 0 and 1 are complete; this is the proposed sequencing for what comes next.

## Phase 0 — Architecture & Bootstrap (complete)

Environment assessment, technology stack, architecture analysis, domain model, repository structure, `CLAUDE.md`, initial config, git setup, and a working (but feature-empty) skeleton: NestJS modular monolith with real module boundaries, a Prisma schema implementing the full domain model, a fully-implemented `ServiceRequest` state machine with tests, a fully-implemented commission-split calculation with tests, a `ServiceArea` CRUD exemplar, and a Next.js Admin Console shell.

## Phase 1 — Identity & Auth (Ch33, Ch50, Ch51) (complete)

OTP-based phone login/registration for Customer/Provider (`POST /auth/otp/request`, `POST /auth/otp/verify`), password login for Admin/Support (`POST /auth/admin/login`), JWT access tokens with opaque DB-backed refresh-token rotation (`POST /auth/refresh`), and guard-based RBAC (`JwtAuthGuard` + `RolesGuard` + `@Roles(...)`) — see `docs/decisions/0011-*.md` for the full design. `RequestController.create()` now derives `customerProfileId` from the authenticated session instead of trusting client input, closing the exact gap this phase existed to close. **Not fully done**: RBAC is role-based only so far — `ServiceArea` cross-city scoping isn't enforced anywhere yet, and only `RequestController`'s read endpoint has a real ownership check. See the Reconciliation Notes below.

## Phase 2 — Core Transaction Flow (Ch52, Ch53, Ch56, Ch57)

Real Matching (candidate retrieval via `ProviderService.findNearestAvailableProviders`, distance-sort ranking, timeout-driven reassignment through `RequestService.transition()`), the deterministic Pricing Engine (Ch56), and Payment settlement against a real gateway (Razorpay, per the Bible's stack) with webhook verification. This is the MVP scope Ch9's condensed entry names: request creation, matching, tracking, payment, rating.

## Phase 3 — Real-Time Tracking (Ch54, Ch75–77)

WebSocket gateway, presence/heartbeat, live location streaming, the `location_pings` TimescaleDB store (Ch40) deferred from Phase 0.

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
| `location_pings` / TimescaleDB not implemented | `docs/domain-model.md` | Phase 3 (Ch40, Ch54) |
| `ServiceArea`-scoped matching-policy config is minimal (launch phase + commission only) | ADR 0006 | Ch53 or a dedicated future chapter formalizes the full config shape |
| Matching offer timeout hardcoded default (90s) | ADR 0004, `.env.example` | Ch53 + Ch121 load testing produce a real number |
| Event backbone is in-memory only, no real queue, no dead-letter queue | ADR 0009 | Ch101 (Cloud Architecture) picks a provider |
| Flutter vs. React Native undecided; `apps/mobile` empty | ADR 0008 | Ch64 (Mobile Architecture Overview) is written |
| No cloud provider chosen | `docs/architecture.md` §15 | Ch101 |
| Docker Compose provided but unverified locally (Docker not found in this environment) | `docs/development.md`, `infrastructure/README.md` | Whenever Docker is available to test against |
| No live `prisma migrate dev` has actually been run — schema, PostGIS SQL scripts, `nest build`, and all 11 unit tests were validated, but not a real database round-trip (this session didn't have local Postgres credentials) | `docs/development.md` §Getting started | First person with real local DB credentials runs the documented steps |
| Prisma pinned to 5.22.x; `prisma generate` reported 7.9.1 is current | `apps/api/package.json` | Before real feature development starts — re-verify no breaking changes in the Prisma 6/7 migration guide first |
| `AdminProfile`/Admin module minimal; no verification-review or dispatch-override UI yet | `docs/domain-model.md`, Ch61 module | Phase 4 |
| No real AI provider behind `AiCapability`; all critical-path calls use their fallback | ADR 0007 | Phase 6 |
| Field-level PII encryption, MFA, WAF/DDoS config not implemented | `docs/security.md` | Phase 7 (Ch93–95) |
| Illustrative 15% commission rate used as the seed default | `prisma/seed.ts`, Ch6 §6.3.4 | Ch4's provider research produces a validated number |
| `AuditLog` wired to only two write paths (commission-rate changes, verification-status changes are the intent; only the service method exists, not yet called from every relevant path) | `apps/api/src/modules/admin` | Phase 4 |
| `ServiceArea` cross-city RBAC scoping not enforced anywhere (role-based RBAC only) | ADR 0011, `docs/architecture.md` §6 | Phase 2, whenever the first cross-city query risk actually appears |
| Ownership/data-access-layer checks only exist for `RequestController`'s read endpoint — `Assignment`, `Payment`, `Rating`, `Vehicle` still need the same treatment | ADR 0011 Consequences | Phase 2+, as each module gets built out |
| No cleanup job for expired `OtpChallenge`/`RefreshToken` rows | ADR 0011 Consequences | Ch62 (Background Jobs) |
| `bcryptjs` chosen over `argon2` specifically because this environment's native build toolchain was never confirmed | ADR 0011 | Ch93 (Identity & Access Security), once toolchain is confirmed |
| Guards applied per-route, not globally via `APP_GUARD` | ADR 0011 | Revisit once the number of protected routes grows past what's easy to eyeball |
