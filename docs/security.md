# MOTIQ Security Conventions

Anticipates Volume IX (Ch92–100). This is the bootstrap-phase baseline, not the full security architecture.

## Authentication

**Implemented as of Phase 1** — see `docs/decisions/0011-*.md`.

- OTP-based phone login/registration for Customer/Provider (Ch50), `bcryptjs` password hashing for Admin/Support — never a homemade hash, never plaintext, ever, under any circumstance. Admin/Support accounts are never publicly self-registered.
- Short-lived JWT access tokens with **opaque, DB-backed refresh-token rotation** (Ch33) — refresh tokens are random strings, stored only as a SHA-256 hash, revoked and replaced on every use. A JWT can't be genuinely revoked without a blocklist, which is why refresh tokens deliberately aren't JWTs here.
- OTP codes are hashed at rest too (SHA-256 — a fast hash is the right call for a 6-digit code; the real defense is the 5-minute expiry, 30-second resend cooldown, and 5-attempt cap, not the hash algorithm). **As of Phase 5** (ADR 0017), OTP delivery goes through a real Twilio adapter (degrading to a logged fallback if unconfigured) rather than always logging — see `NotificationService.sendOtpSms()`.
- No secrets, tokens, or credentials committed to git. `.env` is gitignored; `.env.example` documents every required variable with a placeholder, never a real value.

## Authorization

**Implemented as of Phase 1**, partially — see `docs/architecture.md` §6 for exactly what's covered so far.

- Four roles: `CUSTOMER, PROVIDER, ADMIN, SUPPORT` (Ch33) — each with a distinct, explicit permission set. No "isAdmin" boolean flags bolted onto a generic user role.
- Enforced at the controller layer via `JwtAuthGuard` + `RolesGuard` (`@Roles(...)`), applied per-route. A first data-access-layer example exists (`RequestController` — a Customer can only read their own requests), but this is not yet applied systematically across every module, and `ServiceArea` cross-city scoping is not enforced anywhere yet — both are tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed done.

## Input validation

- Every endpoint validates input via `class-validator` DTOs before it reaches service/business logic (see `docs/api-conventions.md`). No raw `req.body` access.

## Rate limiting

- Per-user/per-provider rate limiting (Ch95), not just a generic gateway-level limit — a compromised single account should not be able to exhaust shared capacity.
- The SOS path (once built, Ch55) is explicitly exempted from any rate limit that could delay a genuine trigger — err toward false positives, never false negatives, on that path specifically.

## Secrets management

- Environment variables for all configuration (master prompt principle 7); in production, a real secrets manager (AWS SSM/Secrets Manager or equivalent, Ch108) — not committed config files. Rotation policy is a Ch108 concern, not designed in this bootstrap phase.
- Money-related constants (commission rate, surge caps) are never code constants — see ADR 0003 and Ch34.

## API security

- Third-party calls (Maps, Payments, SMS, Push) go through an internal adapter, never a direct SDK call from domain code (Ch32) — this is also what makes a circuit-breaker fallback (Ch35) possible. **As of Phase 5**, `TwilioSmsGatewayAdapter` and `FcmPushGatewayAdapter` follow the same pattern as `RazorpayGatewayAdapter` (ADR 0017).
- Webhook signature verification is mandatory for any inbound webhook (payment gateway, Ch57) — never trust an unsigned or unverified webhook payload.

## Audit logging

- `AuditLog` entity (see `docs/domain-model.md`) and `AdminService.recordAuditLog()` exist from day one. **As of Phase 4** (ADR 0016), it's actually wired to real write paths: KYC document review (approve/reject) and provider-verification-tier transitions (including lapsed-verification de-listing). Commission-rate changes (Ch34/ADR 0003) are **still not audit-logged** — tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed done.

## Sensitive data handling

- **Location history** is one of MOTIQ's most sensitive data categories (Ch94, Ch128) — current location is stored on `ProviderProfile`; historical location trails (Ch40's `location_pings`) are explicitly out of scope for this phase, and when built, must be designed with the DPDP Act's consent and retention requirements (Ch126, Ch128) in mind from the start, not retrofitted.
- **Payment data** never touches MOTIQ's own servers directly for card details — tokenization boundary with the payment gateway (Ch97) keeps PCI scope minimized. Not implemented against a real gateway in this bootstrap phase, but the `Payment` schema's design (storing amounts and references, never raw card data) already respects this boundary.
- Encryption at rest for the database is a deployment-environment concern (managed Postgres with encryption enabled) rather than application-level in this phase; field-level encryption for especially sensitive PII (Ch94) is not yet implemented — listed in Reconciliation Notes.

## OWASP-adjacent defaults

- Parameterized queries only — the one raw-SQL escape hatch (PostGIS nearest-provider lookups, ADR 0002) uses Prisma's `$queryRaw` tagged-template form, which parameterizes interpolated values; string-concatenated SQL is never permitted.
- CORS restricted to known origins (`apps/web`, and later `apps/mobile`'s API gateway) — not `*`.
- `helmet` middleware enabled in `main.ts` for secure default HTTP headers.

## What this phase does not implement

Full threat modeling (Ch92), MFA (Ch93), field-level PII encryption (Ch94), WAF/DDoS configuration (Ch95), mobile app hardening (Ch96), and fraud detection (Ch99) are all real, binding future work — not designed here. This document is the baseline the bootstrap phase actually implements; it is not a claim that MOTIQ is secure end-to-end yet.
