# MOTIQ API Conventions

Anticipates Ch29 (API Design Standards) and Ch30 (Sync vs. Async Communication Design). Binding for `apps/api`.

## Versioning

All routes under `/api/v1/...`. Breaking changes get a new version prefix; a deprecated version gets a minimum notice window (exact window TBD by Ch29 — provisional: 90 days) before removal, never a silent break.

## Request validation

Every endpoint's input is a `class-validator`-decorated DTO. No controller reads `req.body` directly. Validation failures return `422 Unprocessable Entity` with the RFC 7807 envelope (below), field-level errors listed in `detail`.

## Response format

Success responses return the resource directly (no envelope wrapper) for single-resource endpoints; list endpoints return `{ data: T[], pagination: {...} }` (see Pagination below). Timestamps are ISO-8601 UTC. Money fields are strings representing a Decimal (e.g. `"1000.00"`), never JSON floats, to avoid floating-point corruption of currency values (Ch14's rounding rule).

## Error format

RFC 7807-style envelope on every non-2xx response:

```json
{
  "type": "https://motiq.dev/errors/invalid-state-transition",
  "title": "Invalid state transition",
  "status": 409,
  "detail": "Cannot transition ServiceRequest from COMPLETED to MATCHING",
  "instance": "/api/v1/requests/abc123"
}
```

`type` is a stable, documented identifier per error category (not just an HTTP status restated) so client code can branch on it without string-matching `detail`.

## HTTP status conventions

- `200` — success (read, update).
- `201` — resource created.
- `204` — success, no body (e.g., a state-transition side-effect endpoint).
- `400` — malformed request (not a validation failure — e.g., bad JSON).
- `401` / `403` — unauthenticated / unauthorized (Ch33/Ch51).
- `404` — resource not found, or not visible to the caller's `ServiceArea`/role scope (never leak existence across a scope boundary via a different status code).
- `409` — conflict (invalid state transition, optimistic-lock version mismatch — Ch43).
- `422` — validation failure.
- `429` — rate-limited (Ch95).
- `5xx` — reserved for genuine server faults; a fallback path (e.g., AI unavailable — ADR 0007) must never surface as a 5xx to the end user if a deterministic fallback exists.

## Pagination, filtering, sorting

Cursor-based pagination for list endpoints (`?cursor=...&limit=...`), not offset-based — offset pagination degrades under concurrent writes to a frequently-changing table like `ServiceRequest`. Filtering via explicit query params per resource (documented per endpoint, not a generic query-DSL). Sorting via `?sort=field:asc|desc`, whitelisted per endpoint — never an arbitrary raw column name from the client.

## Authentication / authorization handling

**Implemented as of Phase 1** — see `docs/decisions/0011-*.md`.

Bearer JWT access token in `Authorization: Bearer <token>`. Every protected route declares `@UseGuards(JwtAuthGuard, RolesGuard)` plus `@Roles(...)` explicitly — never inferred implicitly, and never applied globally in this bootstrap phase (see ADR 0011 for why). `ServiceArea` scoping (Section 8 of `docs/architecture.md`) is **not yet enforced** at the data-access layer — tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed.

Auth endpoints (unauthenticated — these issue the tokens everything else needs):

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/otp/request` | `{ phone }` → generates and "sends" (logs, in this bootstrap phase — no SMS provider, Ch32) a 6-digit code. `204`. |
| `POST /api/v1/auth/otp/verify` | `{ phone, code, role?, displayName?, businessName?, serviceAreaId? }` → login if the phone has a `User` already; registers a new `CUSTOMER`/`PROVIDER` (role-specific fields required) if not. Returns a `TokenPairResponse`. |
| `POST /api/v1/auth/admin/login` | `{ identifier, password }` → Admin/Support only; identical `401` whether the account doesn't exist or the password is wrong. Returns a `TokenPairResponse`. |
| `POST /api/v1/auth/refresh` | `{ refreshToken }` → validates, revokes the presented token, issues a brand-new pair (rotation, Ch33). |

**Admin/Support MFA endpoints, implemented as of Phase 7** (Ch93, ADR 0020, all require a valid access token):

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/admin/mfa/enroll` | Generates a TOTP secret (not yet active) and an `otpauth://` URI for a QR code. |
| `POST /api/v1/auth/admin/mfa/confirm` | `{ code }` → confirms enrollment with a real generated code; only then does `AdminLoginDto.totpCode` become required on future logins. |
| `DELETE /api/v1/auth/admin/mfa` | Disables MFA for the account. |

A `TokenPairResponse` (`{ accessToken, refreshToken, expiresIn }`, shared shape in `@motiq/types`) is never wrapped in the standard success envelope described above — it's the one response shape that's already exactly what the client needs, and it never contains money or list data.

**Core transaction flow endpoints, implemented as of Phase 2** (see ADRs 0012–0014 for the reasoning):

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/requests` | Customer | Creates a request; `RequestCreated` auto-triggers matching. |
| `GET /api/v1/requests/:id` | Customer (own), Provider, Admin, Support | Read one request. |
| `PATCH /api/v1/requests/:id/cancel` | Customer (own) | `→ CANCELLED_BY_CUSTOMER`. |
| `PATCH /api/v1/providers/me/presence` | Provider | Go online/offline, update live location. |
| `POST /api/v1/assignments/:id/accept` \| `/reject` | Provider (own offer) | Reject immediately triggers reassignment. |
| `PATCH /api/v1/assignments/:id/job-status` | Provider (own, accepted) | `PROVIDER_EN_ROUTE → ... → COMPLETED`; `COMPLETED` auto-triggers Payment settlement. |
| `POST /api/v1/matching/sweep-expired` | Admin | Manual stand-in for Ch62's future timeout scheduler. |
| `POST\|GET .../fare-configs`, `.../commission-rates` | Admin (write), open (read) | `ServiceArea`-scoped money configuration (ADR 0003, ADR 0012). |
| `POST /api/v1/requests/:requestId/ratings` | Customer (own, completed) | One rating per request; provider derived from the accepted `Assignment`, never client-supplied. |
| `POST /api/v1/payments/webhooks/razorpay` | Unauthenticated — signature IS the auth | See ADR 0014. |

**Provider verification & trust endpoints, implemented as of Phase 4** (ADR 0016):

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/providers/me/verification-documents` | Provider | Submit a KYC document (`fileUrl` is a client-supplied reference — no real storage integration). |
| `GET /api/v1/providers/me/verification-documents` | Provider | List own submissions. |
| `GET /api/v1/admin/providers/verification-documents` | Admin, Support | List all `PENDING` documents across providers. |
| `PATCH /api/v1/admin/providers/verification-documents/:id/review` | Admin, Support | `{ decision: "APPROVED"\|"REJECTED", notes? }` — does not itself change the provider's tier. |
| `PATCH /api/v1/admin/providers/:id/verification-status` | Admin | `{ status }` — the guarded tier transition; higher-stakes than document review, so Admin-only. |
| `POST /api/v1/admin/providers/verification-sweep` | Admin | Manual stand-in for Ch62's future re-verification-cadence scheduler; de-lists lapsed providers. |
| `GET /api/v1/admin/providers` | Admin, Support | Browse all providers, cursor-paginated — added Phase 8 so the Admin Console has a way to find one to act on. |
| `GET /api/v1/admin/audit-log` | Admin, Support | Read the audit trail, cursor-paginated — added Phase 8; `AuditLog` previously had no read endpoint. |
| `GET /api/v1/auth/admin/mfa` | Admin, Support | `{ mfaEnabled }` for the caller's own account — added Phase 8 for the Admin Console's MFA settings page. |

**Notification endpoints, implemented as of Phase 5** (ADR 0017):

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/notifications/device-tokens` | Any authenticated role | Registers/upserts a push device token (Ch70). |
| `GET\|PATCH /api/v1/notifications/preferences` | Any authenticated role | Read/update own channel opt-outs and quiet hours (Ch59). |

**AI Capability endpoints, implemented as of Phase 6** (ADR 0019 — all deterministic, not ML-trained; see that ADR for why):

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/ai/classify-issue` | Customer | `{ description }` → a suggested `issueType` + confidence (Ch83). Never gates request creation — `CreateServiceRequestDto.issueType` is still always the customer's own explicit choice. |
| `POST /api/v1/ai/assistant/conversations` | Customer, Provider | Starts a new `AiConversation`. |
| `POST /api/v1/ai/assistant/conversations/:id/messages` | Customer, Provider (own conversation) | `{ message }` → `{ reply, emergencyDetected, escalated }` (Ch90). Emergency-intent detection runs before any AI call and, as of Phase 9, files a real SOS alert (see below) — see ADR 0021. No mobile UI calls this yet. |

**SOS endpoints, implemented as of Phase 9** (Ch55, ADR 0021 — `POST /sos/trigger` is exempt from rate limiting and consent-gating, both deliberately):

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/sos/trigger` | Customer, Provider | `{ latitude?, longitude?, serviceRequestId? }` → `{ alertId, message }`. Fans out a `CRITICAL` push to every Admin/Support user immediately. |
| `GET /api/v1/sos/alerts` | Admin, Support | List all alerts, active ones first. |
| `PATCH /api/v1/sos/alerts/:id/acknowledge` | Admin, Support | `TRIGGERED → ACKNOWLEDGED`. |
| `PATCH /api/v1/sos/alerts/:id/resolve` | Admin, Support | `{ outcome: "RESOLVED"\|"FALSE_ALARM", notes? }` — terminal. |

**Consent and Data Rights endpoints, implemented as of Phase 7** (Ch126, Ch128, ADR 0020):

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/v1/consent` | Any authenticated role | List own consent history. |
| `POST\|DELETE /api/v1/consent/location-tracking` | Any authenticated role | Grant/revoke location-tracking consent — gates `POST /requests` and `PATCH /providers/me/presence` (when it carries a location). |
| `GET /api/v1/users/me/data-export` | Any authenticated role | Ch126's binding "real endpoint, not policy language" — every module's data about the caller, in one JSON response. Never includes password hashes, refresh-token hashes, or MFA secrets. |
| `DELETE /api/v1/users/me` | Any authenticated role | Erasure — anonymizes (phone/email/name cleared, account deactivated, refresh tokens revoked) rather than hard-deletes; see ADR 0020 for why. |

## Idempotency

`Idempotency-Key` header **required** on POST/PATCH endpoints with money-movement or job-creation side effects (Ch29, Ch43) — this is the binding rule; **not literally implemented as a client-supplied header yet**. Payment settlement instead uses a server-derived idempotency key (`settle:${serviceRequestId}`, one settlement per request, ever) — see ADR 0014. A real client-supplied `Idempotency-Key` header is tracked in `docs/roadmap.md`'s Reconciliation Notes, not silently assumed done.

## Third-party integration boundary

No controller or service calls a third-party SDK (Maps, Razorpay, SMS) directly — every integration goes through an internal adapter interface (Ch32), enabling the Ch35 circuit-breaker/fallback pattern and protecting against vendor lock-in.

## WebSocket protocol (Ch54, Ch75–77 — implemented as of Phase 3, ADR 0015)

`ws://.../tracking` (Socket.IO namespace). Authenticate once at connection via `auth: { token: "<same JWT access token as REST>" }` in the Socket.IO handshake options (or an `Authorization: Bearer` header) — an invalid/missing token disconnects immediately. Not wrapped in the RFC 7807 envelope; each event below is its own small payload. `apps/mobile`'s `src/realtime/trackingSocket.ts` (Phase 5) is the reference client implementation of this exact protocol.

| Direction | Event | Payload | Notes |
|---|---|---|---|
| Provider → server | `location:update` | `{ latitude, longitude }` | Throttled server-side (`LOCATION_UPDATE_MIN_INTERVAL_MS`); ack: `{ accepted, reason? }`. |
| Provider → server | `presence:heartbeat` | *(none)* | Bumps `lastSeenAt`; ack: `{ acknowledged }`. |
| Customer/Admin/Support → server | `subscribe:request` | `{ serviceRequestId }` | Joins the room for that request; ack: `{ subscribed, reason? }` — a Customer subscribing to a request they don't own gets `subscribed: false`. |
| Server → room `service-request:{id}` | `location:update` | `{ providerProfileId, latitude, longitude, eta }` | `eta` is `{ estimatedMinutes, minMinutes, maxMinutes, distanceMeters }` or `null` if not computable — always a range, never a bare number (Ch1's "never false precision"). |
