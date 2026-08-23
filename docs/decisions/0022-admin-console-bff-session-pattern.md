# 0022 — Admin Console Session Architecture: Next.js as a BFF

**Status:** Provisional
**Bible chapter to reconcile with:** Ch137 (Admin & Operations Console UX)

## Context

`apps/web` existed only as an empty Phase 0 shell until this phase, despite `apps/api`'s `AdminController` (verification review, tier changes, MFA) having real functionality with no UI to drive it. Building the console meant deciding how a Next.js App Router app should hold an authenticated session against a separate NestJS backend — a decision the Bible's condensed Ch137 entry doesn't specify.

## Decision

**apps/web as a Backend-for-Frontend (BFF)**: the browser never talks to `apps/api` directly and never sees a token. `POST /auth/admin/login` (including the MFA flow, ADR 0020) runs inside a Next.js Server Action, which sets the access and refresh tokens as `httpOnly` cookies on the Next.js server's own response — not `localStorage`, not a client-readable cookie. Every page is a Server Component or Server Action that reads the `httpOnly` cookie via `next/headers` and calls `apps/api` server-side (`lib/api.ts`'s `apiFetch()`), consistent with CLAUDE.md's "apps/web talks to apps/api only through the versioned REST API, never direct DB access" — here extended to "and the browser never talks to apps/api directly either."

**No silent token refresh inside Server Components.** React Server Components can read cookies during a render but cannot write them mid-render — only a Server Action or Route Handler can set a new cookie. A Server Component whose `apiFetch()` gets a 401 therefore can't itself refresh and retry; it redirects to `/login`. With the 15-minute `JWT_ACCESS_TTL` default, this means an admin re-authenticates roughly every 15 minutes of active use.

## Alternatives Considered

- **Client-side token storage (`localStorage`) and a client-side fetch layer**, mirroring `apps/mobile`'s pattern. Rejected — `apps/mobile` is a native app where token exposure to the device's own JS runtime is the accepted norm (`expo-secure-store` is the mitigation there); a browser-based admin console handling verification/tier-change authority is a meaningfully higher-value target for XSS-driven token theft. `httpOnly` cookies close that exposure entirely.
- **Implement middleware-level or Route-Handler-mediated silent refresh**, so a Server Component's 401 could transparently retry. Rejected for this phase — solvable, but adds real complexity (a global fetch wrapper with cookie-mutation side effects called from Server Component render paths) for an internal tool with a small number of concurrent admins; a 15-minute re-login is judged an acceptable, honest tradeoff to ship the console at all rather than block on a more elaborate session-refresh design.

## Consequences

- An admin actively using the console for more than ~15 minutes will be bounced to `/login` mid-task with no warning. This is a real, known UX rough edge, not silently hidden — tracked in Reconciliation Notes.
- Because the browser never holds a token, there's no client-side XSS path to steal an admin's session — a real security property, not just a convenience choice.
- Every new Admin Console page must follow the same pattern (Server Component/Action calling `lib/api.ts`, never a client-side `fetch` to `apps/api`) — a `"use client"` component calling the backend directly would silently reintroduce the exact exposure this ADR closes.
