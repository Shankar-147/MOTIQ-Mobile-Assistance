# MOTIQ Threat Model

Ch92's STRIDE analysis against MOTIQ's actual attack surface, as built through Phase 6 — not a generic checklist. This is a living document; extend it as new modules ship, don't treat it as a one-time exercise.

## Scope

`apps/api` (the modular monolith), `apps/mobile` (Customer/Provider apps), `apps/web` (Admin Console). Infrastructure-layer threats (network, cloud IAM) are out of scope until a cloud provider is chosen (Ch101) — see `docs/roadmap.md`'s Reconciliation Notes.

## STRIDE, by concrete MOTIQ scenario

### Spoofing

| Threat | Current mitigation | Gap |
|---|---|---|
| A customer/provider account takeover via stolen refresh token | Opaque, single-use, DB-hashed refresh tokens (ADR 0011); short-lived (15 min) access tokens | No device-binding or anomaly detection on token reuse |
| An Admin/Support account takeover | Password + optional TOTP MFA (Ch93, Phase 7) | MFA is opt-in, not enforced; no login-anomaly alerting (Ch112, deferred) |
| A provider spoofing a customer's location or vice versa | JWT-authenticated WebSocket handshake (ADR 0015); `@CurrentUser()` never trusts client-supplied IDs (ADR 0011) | — |

### Tampering

| Threat | Current mitigation | Gap |
|---|---|---|
| GPS spoofing for fake job completion (Ch99's named scenario) | `gps-spoof.util.ts` flags physically-implausible speed between consecutive pings (Phase 7) | Advisory only — never blocks completion/payment (by design, ADR 0007's "additive, never load-bearing"); no aggregate fraud-pattern detection across providers |
| Tampering with a KYC document reference in transit/at rest | `fileUrl` encrypted at rest (AES-256-GCM, Phase 7); Prisma parameterized queries only | No file-content integrity check (there's no real file storage yet — ADR 0016) |
| Tampering with a Razorpay webhook payload | Mandatory signature verification against `req.rawBody` (ADR 0014) | — |

### Repudiation

| Threat | Current mitigation | Gap |
|---|---|---|
| A provider denying they accepted/rejected an offer | `Assignment.respondedAt`, optimistic-lock `version` (Ch43) | — |
| An Admin denying a verification-status change | `AuditLog` wired to verification writes (ADR 0016) | Commission-rate changes NOT audit-logged (tracked in Reconciliation Notes since Phase 4) |

### Information Disclosure

| Threat | Current mitigation | Gap |
|---|---|---|
| KYC document reference leaking from a DB dump | AES-256-GCM encryption at rest (Phase 7, ADR 0020) | Master key is a bare env var, not a real KMS — see ADR 0020's honest gap note |
| PII leaking via application logs | `pii-redaction.util.ts` (Phase 7) | Not yet applied to every existing `Logger.log()` call site — a convention, not a retrofit (ADR 0020) |
| A customer reading another customer's `ServiceRequest` | Ownership check in `RequestController.findOne()` (ADR 0011) | Provider/Admin/Support reads are unrestricted within their role (documented gap since Phase 1) |
| `ServiceArea` cross-city data leaking to a session scoped to another city | — | **Not implemented anywhere** (CLAUDE.md rule 8's explicitly-flagged gap since Phase 1) |

### Denial of Service

| Threat | Current mitigation | Gap |
|---|---|---|
| OTP-request spam against one phone number | Per-phone resend cooldown (30s) + per-tracker rate limit (5/min, Phase 7) | — |
| Credential-stuffing against admin login | 5/min rate limit (Phase 7), generic invalid-credentials message | No account lockout after N failures (separate from the per-request rate limit) |
| A compromised single account exhausting shared API capacity | Per-user (not just per-IP) global rate limit via JWT-subject tracking (Phase 7, Ch95) | No WAF/DDoS layer (Ch95's other half — infra, deferred to Ch101) |
| AI Assistant cost exhaustion via message flooding | Per-conversation cost cap + message cap + per-route rate limit (Phase 6/7) | — |

### Elevation of Privilege

| Threat | Current mitigation | Gap |
|---|---|---|
| A Customer calling a Provider/Admin-only endpoint | `@Roles()` + `RolesGuard` on every protected route (ADR 0011) | Guards are per-route, not global via `APP_GUARD` — a new route could ship unprotected by omission (flagged since Phase 1) |
| A DTO smuggling `customerProfileId`/`providerProfileId` to act as someone else | Actor identity always derived from `@CurrentUser()`, never DTO fields (ADR 0011, binding) | — |

## What this threat model deliberately does not cover

Full penetration testing (Ch122), fraud-pattern detection beyond the single-signal GPS heuristic above (Ch99's fuller scope), and infrastructure-layer threats pending a cloud provider decision (Ch101) — see `docs/roadmap.md`.
