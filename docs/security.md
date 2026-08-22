# MOTIQ Security Conventions

Anticipates Volume IX (Ch92–100). This is the bootstrap-phase baseline, not the full security architecture.

## Authentication

**Implemented as of Phase 1** — see `docs/decisions/0011-*.md`.

- OTP-based phone login/registration for Customer/Provider (Ch50), `bcryptjs` password hashing for Admin/Support — never a homemade hash, never plaintext, ever, under any circumstance. Admin/Support accounts are never publicly self-registered.
- Short-lived JWT access tokens with **opaque, DB-backed refresh-token rotation** (Ch33) — refresh tokens are random strings, stored only as a SHA-256 hash, revoked and replaced on every use. A JWT can't be genuinely revoked without a blocklist, which is why refresh tokens deliberately aren't JWTs here.
- OTP codes are hashed at rest too (SHA-256 — a fast hash is the right call for a 6-digit code; the real defense is the 5-minute expiry, 30-second resend cooldown, and 5-attempt cap, not the hash algorithm). **As of Phase 5** (ADR 0017), OTP delivery goes through a real Twilio adapter (degrading to a logged fallback if unconfigured) rather than always logging — see `NotificationService.sendOtpSms()`.
- No secrets, tokens, or credentials committed to git. `.env` is gitignored; `.env.example` documents every required variable with a placeholder, never a real value.
- **As of Phase 7** (Ch93, ADR 0020): opt-in TOTP MFA for Admin/Support accounts (`POST /auth/admin/mfa/enroll` → `POST /auth/admin/mfa/confirm`, RFC 6238, any standard authenticator app). Not enforced — an account can operate password-only, tracked in Reconciliation Notes.

## Authorization

**Implemented as of Phase 1**, partially — see `docs/architecture.md` §6 for exactly what's covered so far.

- Four roles: `CUSTOMER, PROVIDER, ADMIN, SUPPORT` (Ch33) — each with a distinct, explicit permission set. No "isAdmin" boolean flags bolted onto a generic user role.
- Enforced at the controller layer via `JwtAuthGuard` + `RolesGuard` (`@Roles(...)`), applied per-route. A first data-access-layer example exists (`RequestController` — a Customer can only read their own requests), but this is not yet applied systematically across every module, and `ServiceArea` cross-city scoping is not enforced anywhere yet — both are tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed done.

## Input validation

- Every endpoint validates input via `class-validator` DTOs before it reaches service/business logic (see `docs/api-conventions.md`). No raw `req.body` access.

## Rate limiting

**Implemented as of Phase 7** (Ch95, ADR 0020).

- Global default limit via `@nestjs/throttler`, tracked **per-user** (the JWT subject, decoded but not verified — bucketing only, never a substitute for real auth) when a Bearer token is present, falling back to per-IP for unauthenticated requests — not just a generic gateway-level limit, per Ch95's binding requirement. See `throttle-tracker.util.ts`.
- Tighter per-route limits on OTP request/verify, admin login, and AI Assistant messages — the endpoints where abuse is cheapest for an attacker and costliest for MOTIQ or its users.
- The SOS path (once built, Ch55) will need to be explicitly exempted from any rate limit that could delay a genuine trigger — err toward false positives, never false negatives, on that path specifically. Not applicable yet since Ch55 doesn't exist.

## Secrets management

- Environment variables for all configuration (master prompt principle 7); in production, a real secrets manager (AWS SSM/Secrets Manager or equivalent, Ch108) — not committed config files. Rotation policy is a Ch108 concern, not designed in this bootstrap phase.
- Money-related constants (commission rate, surge caps) are never code constants — see ADR 0003 and Ch34.

## API security

- Third-party calls (Maps, Payments, SMS, Push, AI) go through an internal adapter, never a direct SDK call from domain code (Ch32) — this is also what makes a circuit-breaker fallback (Ch35) possible. **As of Phase 5**, `TwilioSmsGatewayAdapter` and `FcmPushGatewayAdapter` follow the same pattern as `RazorpayGatewayAdapter` (ADR 0017). **As of Phase 6**, `AnthropicAssistantAdapter` does too (ADR 0019) — its cost-per-conversation cap (`AI_ASSISTANT_MAX_COST_USD_PER_CONVERSATION`) also functions as a basic abuse/cost-exhaustion control, separate from Ch95's general rate limiting.
- Webhook signature verification is mandatory for any inbound webhook (payment gateway, Ch57) — never trust an unsigned or unverified webhook payload.

## Audit logging

- `AuditLog` entity (see `docs/domain-model.md`) and `AdminService.recordAuditLog()` exist from day one. **As of Phase 4** (ADR 0016), it's actually wired to real write paths: KYC document review (approve/reject) and provider-verification-tier transitions (including lapsed-verification de-listing). Commission-rate changes (Ch34/ADR 0003) are **still not audit-logged** — tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed done.

## Sensitive data handling

- **Location history** is one of MOTIQ's most sensitive data categories (Ch94, Ch128). **As of Phase 7** (ADR 0020): `RequestController.create()` and `ProviderController.updateOwnPresence()` (when it carries a location) both gate on a real, versioned, audited `ConsentRecord` (Ch128) via `ConsentService.requireConsent()` — not just policy language. Historical location trails (Ch40's `location_pings`) still have no separate retention/deletion policy beyond raw retention (tracked since Phase 3).
- **Payment data** never touches MOTIQ's own servers directly for card details — tokenization boundary with the payment gateway (Ch97) keeps PCI scope minimized. Not implemented against a real gateway in this bootstrap phase, but the `Payment` schema's design (storing amounts and references, never raw card data) already respects this boundary.
- Encryption at rest for the database is a deployment-environment concern (managed Postgres with encryption enabled) rather than application-level for most fields. **As of Phase 7** (Ch94, ADR 0020): `ProviderVerificationDocument.fileUrl` is encrypted at the application layer (AES-256-GCM, `encryption.util.ts`) — the most sensitive currently-stored field. The master key is a bare `ENCRYPTION_MASTER_KEY` env var, not a real KMS-managed key (no KMS exists in this environment) — `encryptField()`/`decryptField()` throw rather than silently storing plaintext when unconfigured.
- **Data Principal rights** (Ch126, binding): `GET /users/me/data-export` and `DELETE /users/me` are real endpoints as of Phase 7, not policy language. Erasure anonymizes rather than hard-deletes — see ADR 0020's reasoning.

## OWASP-adjacent defaults

- Parameterized queries only — the one raw-SQL escape hatch (PostGIS nearest-provider lookups, ADR 0002) uses Prisma's `$queryRaw` tagged-template form, which parameterizes interpolated values; string-concatenated SQL is never permitted.
- CORS restricted to known origins (`apps/web`, and later `apps/mobile`'s API gateway) — not `*`.
- `helmet` middleware enabled in `main.ts` for secure default HTTP headers.

## Fraud detection

**Partially implemented as of Phase 7** (Ch99, ADR 0020) — `gps-spoof.util.ts` flags a physically-implausible speed between a provider's consecutive `location_pings` (the "fake job completion" scenario Ch99 names), setting `LocationPing.flaggedAsSuspicious` and logging a warning. Advisory only, never blocks the tracking write path or a payment (ADR 0007's "additive, never load-bearing" principle). No aggregate cross-provider fraud-pattern or fake-account/collusion detection (Ch99's fuller scope) exists yet.

## Logging and tracing

**Implemented as of Phase 7** (Ch110/111, ADR 0020) — `correlation-id.middleware.ts` generates or propagates an `X-Correlation-Id` on every request, echoed in the response header, for tracing one request across logs once a log aggregator exists (Ch101 pending). `pii-redaction.util.ts` masks phone/email patterns before they reach a log line. Both are plumbing and convention — not yet retrofitted across every existing `Logger.log()` call site.

## What this phase does not implement

See `docs/threat-model.md` (Ch92) for the full attack-surface analysis and `docs/roadmap.md`'s Reconciliation Notes for the itemized list. In short: everything presupposing real deployed infrastructure (Ch101–108, Ch112–117 — cloud provider, CI/CD, secrets manager, alerting, backup/DR, chaos engineering), mobile app hardening (Ch96 — certificate pinning, root/jailbreak detection, needs `apps/mobile` actually running on a device), and a real KMS for `ENCRYPTION_MASTER_KEY` (Ch94's fuller intent). This document is the baseline the bootstrap phase actually implements; it is not a claim that MOTIQ is secure end-to-end yet.
