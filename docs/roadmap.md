# MOTIQ — Phased Implementation Roadmap

Companion to `docs/architecture.md`. Phases 0–4 are complete; this is the proposed sequencing for what comes next.

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

## Phase 4 — Provider Verification & Trust (Ch58, Ch61, Ch98) (complete)

A guarded verification-status state machine (ADR 0016, same discipline as `ServiceRequest`'s) replaces the plain-field write that existed since Phase 0. KYC document submission (Provider self-service) and review/tier decisions (Admin, Ch61's "provider-verification workflow backend") are separate, explicit actions — reviewing a document never auto-changes a tier. Re-verification cadence with de-listing triggers (`sweepLapsedVerifications()`, the same Admin-triggered manual-sweep pattern as Matching's timeout expiry) is real. `AuditLog` is now actually wired to real write paths (document review, tier changes, lapsed de-listing) for the first time since Phase 0. Trust score (Ch58) — Bayesian-adjusted rating × verification multiplier, deliberately distinct from raw `ratingAverage` — is computed and stored, feeding a Ch84 ranking model that doesn't exist yet.

**Not fully done**: no document-sufficiency automation (by design — Ch98 doesn't specify one); `fileUrl` is an unvalidated client-supplied reference, no real file storage/scanning; commission-rate changes are still not audit-logged (only verification-related writes are); re-verification sweep has no recurring scheduler, same manual-trigger posture as every other "Ch62 not built yet" item. See the Reconciliation Notes below.

## Phase 5 — Notifications, Mobile Apps (Ch32, Ch59, Ch64–74) (complete)

Real multi-channel notification adapters (ADR 0017): Twilio for SMS (including OTP delivery, replacing Phase 1's console-log-only path), FCM's legacy HTTP API for push, both behind Ch32 adapter ports and degrading to a logged fallback when unconfigured — the same pattern established for Razorpay in Phase 2. Per-user notification preferences and quiet hours are real and enforced, with Ch79's CRITICAL tier (SOS, OTP) always bypassing suppression. `NotificationEventListener` fans out `RequestCreated`/`ProviderAssigned`/`PaymentSettled`/`RatingSubmitted` into push notifications the same way Matching/Payment already reacted to each other (ADR 0013).

The Flutter-vs-React-Native question (ADR 0008) is resolved: **React Native via Expo** (ADR 0018), reasoned from `packages/types`' direct TypeScript sharing and this environment having no Flutter SDK installed. `apps/mobile` is now a real Expo/TypeScript app — Customer and Provider experiences as separate navigation stacks in one codebase (Ch65), covering Ch71's request-creation/live-tracking/payment-rating flow and Ch72's job-offer/accept/status flow at equal depth, Ch66's token-refresh-aware API layer, Ch67's offline request-queuing guarantee, Ch68's foreground-only location streaming, Ch69's WebSocket tracking client, Ch70's Android push registration, and Ch73's shared accessibility constants.

**Not fully done**: `apps/mobile` has been type-checked and linted but never run through Metro, opened in Expo Go, or built for a device/simulator — no Expo/Xcode/Android Studio tooling available in this environment (see ADR 0018). iOS push (needs a separate APNs adapter) and true background location tracking (needs `expo-task-manager`) are both unbuilt. The SOS/SMS-fallback requirement (Ch67, Ch55) has nothing to fall back to yet, since no SOS endpoint exists on the backend. No "list Service Areas" or "my pending offer" endpoint exists for mobile clients, so onboarding/offer-recovery both lean on manual IDs or push-notification delivery with no in-app fallback. Twilio/FCM have never been exercised against real credentials. See the Reconciliation Notes below.

## Phase 6 — AI Capabilities (Ch80–91) (complete)

`AiModule` (ADR 0019) is the concrete home for ADR 0007's `AiCapability` port: `classifyIssueCategory()` (Ch83), `rankProviders()` (Ch84), and `assistantReply()` (Ch90) are all real, callable, deterministic-by-default implementations — not machine-learned, since this bootstrap has no historical data to train against, but genuinely functional. `MatchingService.dispatch()` now ranks candidates by a weighted distance+trustScore score before offering, falling back to plain distance-sort (Ch84/Ch35's binding fallback) if ranking throws. The AI Assistant runs Ch90's mandatory emergency-intent pre-filter before any conversational response, tracks and caps cost-per-conversation, and calls a real Anthropic adapter that degrades to a small hardcoded FAQ responder when unconfigured (no API key in this environment). Ch85's ETA prediction was already implemented in Phase 3 and is unchanged.

**Not fully done, and deliberately not faked**: Ch81 (Feature Store), Ch82 (ML Data Pipeline), Ch86 (Demand Forecasting), Ch87 (Training Pipeline), Ch88 (Model Registry), Ch89 (Drift Monitoring), and most of Ch91 (Governance) are all explicitly deferred — none of them have anything real to operate on (no trained model, no historical demand data) in an environment that has never connected to a live database with real traffic. Most importantly: **Ch90's binding requirement to redirect an emergency to the SOS path cannot be fully satisfied, because Ch55 (the SOS path itself) does not exist yet.** The emergency pre-filter still stops the assistant from conversationally engaging with an emergency, but it can only tell the user to contact real emergency services directly, not redirect into an in-app flow that was never built. See ADR 0019 for the full reasoning and the explicit flag on this gap.

## Phase 7 — Security Hardening, Observability, Compliance (Volumes IX, X, XII) (complete)

Real code where real code was possible; honest documents and explicit deferrals everywhere else (ADR 0020). **Security**: per-user rate limiting via JWT-subject tracking (Ch95, closing a gap flagged since Phase 1); opt-in TOTP MFA for Admin/Support (Ch93); AES-256-GCM field-level encryption applied to KYC `fileUrl` (Ch94); a GPS-spoof heuristic flagging physically-implausible provider movement (Ch99, advisory-only). **Observability**: correlation-ID propagation (`X-Correlation-Id`) and a PII-redaction utility for logs (Ch110/111 plumbing). **Compliance**: real `GET /users/me/data-export` and `DELETE /users/me` endpoints (Ch126's binding "real endpoints, not policy language"), erasure resolved as anonymization rather than hard-delete (Ch131); a real, versioned, audited `ConsentRecord` gate on location collection (Ch128), wired into both `apps/api` and `apps/mobile` in the same phase so the system stays consistent. **Documents**: a real threat model (`docs/threat-model.md`), incident-response procedure (`docs/incident-response.md`), and proposed SLO targets (`docs/slo.md`) — grounded in what's actually built, not generic templates.

**Not fully done, and deliberately not faked**: everything presupposing real deployed infrastructure (Ch101–108's cloud/CI/CD/secrets-manager chapters, Ch112–117's alerting/synthetic-monitoring/backup/DR/chaos-engineering chapters) is deferred — there is no cloud provider chosen, no CI pipeline, no monitoring stack for any of it to configure or run against. Legal-drafting chapters (Ch127 data localization, Ch129 Terms of Service/liability, Ch130 gig-worker classification) need real counsel, not a coding session's invented positions. `ENCRYPTION_MASTER_KEY` is a bare env var, not a real KMS key. See ADR 0020 for the full reasoning and the Reconciliation Notes below for the itemized list.

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
| `AdminProfile`/Admin module: verification-review workflow now real (Phase 4); manual dispatch override (Ch61's other named responsibility) still not implemented | `docs/domain-model.md`, Ch61 module | Whenever manual dispatch override is needed |
| No real AI provider behind `AiCapability`; all critical-path calls use their fallback | ADR 0007 | Phase 6 |
| Field-level PII encryption, MFA, WAF/DDoS config not implemented | `docs/security.md` | Phase 7 (Ch93–95) |
| Illustrative 15% commission rate used as the seed default | `prisma/seed.ts`, Ch6 §6.3.4 | Ch4's provider research produces a validated number |
| `AuditLog` now wired to verification-related write paths (Phase 4); commission-rate changes still not audit-logged | ADR 0003, ADR 0016 | Whenever commission-rate changes need the same audit trail |
| Document-type taxonomy (`DRIVING_LICENSE`, etc.), re-verification cadence (30/180 days), and trust-score formula (Bayesian prior + verification multiplier) are all this bootstrap phase's own invention — Ch98/Ch58 haven't specified any of them | ADR 0016 | Ch58/Ch98 written at full depth |
| `fileUrl` on KYC documents is an unvalidated client-supplied reference — no real file storage, virus scanning, or access control | ADR 0016 | Ch94 (Data Protection & Encryption Architecture) |
| Trust score computed and stored but consumed by nothing yet (Ch84's ranking model doesn't exist) | ADR 0016 | Phase 6 (Ch84) |
| `ServiceArea` cross-city RBAC scoping not enforced anywhere (role-based RBAC only) | ADR 0011, `docs/architecture.md` §6 | Phase 2, whenever the first cross-city query risk actually appears |
| Ownership checks now also exist for cancel/accept/reject/job-status/rating (Phase 2), but `Payment` and `Vehicle` still have none | ADR 0011 Consequences | Phase 2+, as each remaining module gets built out |
| No cleanup job for expired `OtpChallenge`/`RefreshToken` rows | ADR 0011 Consequences | Ch62 (Background Jobs) |
| `bcryptjs` chosen over `argon2` specifically because this environment's native build toolchain was never confirmed | ADR 0011 | Ch93 (Identity & Access Security), once toolchain is confirmed |
| Guards applied per-route, not globally via `APP_GUARD` | ADR 0011 | Revisit once the number of protected routes grows past what's easy to eyeball |
| Flutter vs. React Native resolved to React Native/Expo (Phase 5, ADR 0018) — but reasoned from this environment's toolchain (no Flutter SDK installed), not from a Ch64 requirement | ADR 0018 | Ch64 written at full depth, or once real mobile engineers are hired |
| `apps/mobile` type-checked and linted only — never run through Metro, Expo Go, or a real device/simulator build; no Expo/Xcode/Android Studio available in this environment | ADR 0018 | First person with Expo tooling available |
| FCM's legacy `fcm/send` HTTP API used instead of the current HTTP v1 API, to avoid an extra OAuth2-capable dependency for an unconfigured channel | ADR 0017 | Before a real production push launch — Google has deprecated the legacy API |
| iOS push not implemented — the backend's PushGatewayPort only speaks FCM; iOS needs a separate APNs adapter | ADR 0017, ADR 0018 | Whenever iOS push is prioritized |
| Twilio/FCM adapters never exercised against real credentials | ADR 0017 | First person with real Twilio/FCM credentials |
| Notification preference/quiet-hours model (field shape, hour-granularity) is this bootstrap phase's invention, not Ch59-specified | ADR 0017 | Ch59 written at full depth |
| Background location tracking (Ch68's actual named subject) not implemented — `apps/mobile`'s tracking is foreground-only | ADR 0018 | Whenever `expo-task-manager` background tasks are added |
| SMS-based SOS fallback (Ch67, non-negotiable per that chapter) not implemented on mobile — there's no backend SOS endpoint (Ch55) yet for it to fall back to | ADR 0018 | Ch55 (SOS path) is built |
| No "list Service Areas" endpoint for an authenticated mobile user, and no "my pending offer" endpoint for a provider — onboarding and offer-recovery both lean on manual IDs / push-notification delivery with no in-app fallback | `docs/api-conventions.md` | Whenever either endpoint is prioritized |
| `ENCRYPTION_MASTER_KEY` is a bare env var, not a real KMS-managed key; no rotation procedure exists (re-encrypting existing rows under a new key needs a migration script) | ADR 0020 | Ch101 (cloud provider) picks a real KMS |
| PII-redaction utility (`pii-redaction.util.ts`) and correlation-ID propagation exist as plumbing/convention, not retrofitted across every existing `Logger.log()` call site | ADR 0020 | Ongoing, as call sites are touched for other reasons |
| GPS-spoof detection (Ch99) is a single-signal heuristic (implausible speed between two pings) — no aggregate fraud-pattern or fake-account/collusion detection (Ch99's fuller scope) | ADR 0020 | Whenever real fraud incidents provide patterns to detect against |
| MFA (Ch93) is opt-in for Admin/Support, not enforced; no account-lockout-after-N-failures separate from the per-request rate limit | ADR 0020 | Ch93 written at full depth, or a real incident motivates enforcement |
| No cloud provider (Ch101), CI/CD pipeline (Ch105/106), monitoring/paging stack (Ch109/112/113), verified backup/restore (Ch114), or DR runbooks (Ch115) exist — Ch101–108 and Ch112–117 are entirely deferred | ADR 0020 | First real infrastructure decision |
| Ch127 (data localization), Ch129 (Terms of Service/liability), Ch130 (gig-worker classification) not addressed — need real legal counsel, not a coding session's invented positions | ADR 0020 | Real legal review is commissioned |
| Ch132 (accessibility compliance audit) not formally audited — Phase 5's mobile `a11y.ts` constants are a real but self-assessed start, not a specialist review | ADR 0020 | An accessibility specialist reviews `apps/mobile` |
| `ServiceArea` cross-city scoping (CLAUDE.md rule 8) still not implemented — the threat model (`docs/threat-model.md`) reconfirms this gap explicitly rather than letting Phase 7 imply it's now covered | ADR 0011, `docs/architecture.md` §6 | Whenever the first cross-city query risk actually appears |
| Ch90's "redirect to SOS path" requirement not fully satisfiable — Ch55 (SOS path) doesn't exist; the AI Assistant's emergency pre-filter can only tell the user to contact real emergency services, not trigger an in-app SOS flow | ADR 0019 | Ch55 is built |
| Issue classifier (Ch83) and provider ranking (Ch84) are deterministic heuristics (keyword matching, weighted distance+trust score), not trained ML models — no historical request/rating data exists in this bootstrap to train on | ADR 0019 | First person with real historical production data |
| Ch81 (Feature Store), Ch82 (ML Data Pipeline), Ch86 (Demand Forecasting), Ch87 (Training Pipeline), Ch88 (Model Registry), Ch89 (Drift Monitoring), most of Ch91 (Governance) — none built; no trained model or historical data exists for any of them to operate on | ADR 0019 | Once a real model/training pipeline exists to register, monitor, or govern |
| `AnthropicAssistantAdapter` never exercised against a real API key | ADR 0019 | First person with real Anthropic credentials |
| No mobile UI for the AI Assistant or the issue-classification suggestion — both are backend-only (`POST /ai/...`) this phase | ADR 0019, `docs/api-conventions.md` | Whenever a mobile screen for either is prioritized |
| Ranking weights (70% distance / 30% trust) and the AI Assistant's cost cap are this bootstrap phase's own tuning constants, not Bible-specified | ADR 0019 | Ch84/Ch90 written at full depth, or real usage data to tune against |
