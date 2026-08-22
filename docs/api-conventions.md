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

Bearer JWT access token in `Authorization: Header`. Every protected route declares its required role(s) via a NestJS guard/decorator — never inferred implicitly. `ServiceArea` scoping (Section 8 of `docs/architecture.md`) is enforced at the data-access layer, not just the controller layer.

## Idempotency

`Idempotency-Key` header **required** on POST/PATCH endpoints with money-movement or job-creation side effects (Ch29, Ch43) — payment-intent creation and service-request creation specifically. The server stores the key against the resulting resource and returns the original result on a retried request with the same key, rather than creating a duplicate.

## Third-party integration boundary

No controller or service calls a third-party SDK (Maps, Razorpay, SMS) directly — every integration goes through an internal adapter interface (Ch32), enabling the Ch35 circuit-breaker/fallback pattern and protecting against vendor lock-in.
