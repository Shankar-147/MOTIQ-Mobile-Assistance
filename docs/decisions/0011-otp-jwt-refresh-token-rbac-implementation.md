# 0011 — OTP + JWT + Opaque Refresh Tokens, Guard-Based RBAC

**Status:** Confirmed (the requirements below are binding per Ch33/Ch50/Ch51); **Provisional** (the specific implementation choices — opaque vs. JWT refresh tokens, bcryptjs, per-route vs. global guards)
**Bible chapter to reconcile with:** Ch33 (Authentication & Authorization Architecture), Ch50 (Authentication Service Design), Ch51 (Authorization & RBAC Implementation)
**Mission commitment served (Ch1 §1.4.2):** verification infrastructure — knowing who is actually behind a Customer, Provider, or Admin session is the precondition for every other trust claim MOTIQ makes

## Context

Ch33 requires: four distinct roles (`CUSTOMER, PROVIDER, ADMIN, SUPPORT`) with no shared "user" role and ad hoc flags; refresh-token rotation; short-lived access tokens. Ch50 requires OTP-based login for phone-first Customer/Provider users. Ch51 requires guard-level enforcement of the role model at both the controller and data-access layers. `docs/roadmap.md`'s Phase 1 additionally required removing the fake, client-supplied `customerProfileId` this bootstrap phase's `RequestController` accepted in Phase 0.

## Decision

- **OTP delivery**: no real SMS provider (Ch32) is wired yet — the generated code is logged loudly (`[DEV ONLY — no SMS provider wired, Ch32] ...`), the same console/log-adapter pattern already established for `NotificationService`. A 6-digit code, SHA-256-hashed at rest (fast hash is correct here — the actual defense is the 5-minute expiry, a 30-second resend cooldown, and a 5-attempt cap, not the hash algorithm).
- **Registration is folded into `POST /auth/otp/verify`**: if the phone has no `User` yet, the same endpoint creates one — `role` (`CUSTOMER`/`PROVIDER`) plus role-specific fields become required at that point. This avoids a separate, easy-to-forget "register" endpoint that could drift out of sync with "login."
- **Admin/Support accounts are never self-registered** — Ch33 treats them as a distinct trust tier from Customer/Provider. They're provisioned out of band; in this bootstrap phase that means `prisma/seed.ts`, gated on an `ADMIN_SEED_PASSWORD` env var with no built-in default, so a real deployment can't accidentally ship a guessable admin password.
- **Access tokens are JWTs** (short-lived, `JWT_ACCESS_TTL`, default 15m), signed with `@nestjs/jwt`. **Refresh tokens are opaque random strings** (32 bytes, hex), not JWTs — stored only as a SHA-256 hash in a new `RefreshToken` table with `expiresAt`/`revokedAt`. A JWT refresh token can't be revoked without a blocklist, which defeats the point of using a stateless token for it in the first place; an opaque, DB-backed token can be rotated and revoked for real, which is what "refresh-token rotation" in Ch33 actually requires. `POST /auth/refresh` revokes the presented token and issues a brand-new pair every time — single-use, not reusable.
- **Password hashing** (Admin/Support only) uses `bcryptjs` — pure JavaScript, no native build step, chosen specifically because this environment's C++ build toolchain (Python, MSVC) was never confirmed present during the bootstrap's environment assessment (`docs/development.md`).
- **Guards are applied per-route** (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`), not globally via `APP_GUARD`. Most read endpoints stay open in this bootstrap phase (e.g. listing `ServiceArea`s so an unauthenticated mobile client can let a user pick a city); an explicit guard on the routes that need it was judged more honest than a global guard with scattered `@Public()` exceptions everywhere else.
- **`IdentityModule` is `@Global()`**, matching `PrismaModule`'s existing pattern — registering `JwtStrategy` there makes `AuthGuard('jwt')` usable from any other module without that module importing `IdentityModule` itself (Passport's strategy registry isn't scoped to Nest's DI graph the way most providers are).
- **`RequestController.create()` now derives `customerProfileId` from `@CurrentUser()`**, never from the request body — the DTO no longer has the field at all, closing the gap Phase 0 explicitly flagged as unacceptable to carry forward.
- **A first data-access-layer check**: `RequestController.findOne()` verifies a `CUSTOMER` caller owns the request they're asking for (`request.customerProfileId === user.profileId`), not just that they hold *a* valid role — this is the "at the data-access layer, not just the controller" half of Ch51's requirement, though only implemented for this one read path so far (see Consequences).

## Alternatives Considered

- **JWT refresh tokens with a revocation blocklist.** Rejected — more moving parts (a blocklist store, cleanup job) to achieve exactly what an opaque DB-backed token gets for free.
- **`argon2` instead of `bcryptjs`.** `argon2`'s reference Node binding is native (requires a C++ build step); `bcryptjs` avoids that risk entirely in an environment where the build toolchain wasn't verified. Revisit once Ch93 (Identity & Access Security) is written and this environment's toolchain is confirmed.
- **A global `JwtAuthGuard` via `APP_GUARD` with `@Public()` opt-outs.** Considered more "secure by default," but for this phase's small, mostly-open read surface it would have meant more decorators to track than the explicit-guard approach, for no real safety gain yet — worth revisiting once the number of protected routes grows past what's easy to eyeball.

## Consequences

- Every future controller that creates or reads data scoped to a specific actor must follow `RequestController`'s pattern: derive the owning ID from `@CurrentUser()`, never trust it from the client, and add an explicit ownership/scope check for reads — this is not yet done for `Assignment`, `Payment`, `Rating`, or `Vehicle` (Phase 2 and later own those).
- `ServiceArea` scoping (ADR 0006) — "a request against city A's data must not be satisfiable from another city's session" — is **not yet enforced anywhere**; RBAC in this phase is role-based only, not area-scoped. This is listed in `docs/roadmap.md`'s Reconciliation Notes as a Phase 2+ item, since no endpoint yet does cross-city queries that would expose the gap.
- `OtpChallenge` rows and used/expired `RefreshToken` rows accumulate with no cleanup job yet (Ch62's background-jobs chapter would own that) — fine at bootstrap scale, not fine indefinitely.
