# CLAUDE.md

Guidance for any Claude Code session (or human) working in this repository.

## Read this first, always

**`docs/handbook/` is authoritative project context.** Before any major architectural change — a new module, a new domain entity, a change to the service-request state machine, a change to how commission or payments work — read the relevant chapter(s). Start with `docs/handbook/00-table-of-contents.md` to find the right chapter, then check `docs/handbook/volumes-02-to-14-condensed-reference.md` for that chapter's binding constraints even if it hasn't been written at full depth yet.

**The binding-constraint rule:** where a condensed chapter (8–145) states a concrete decision, it is binding — exactly as if it were a full chapter. Do not silently override it, even if a different approach seems technically cleaner. If you think a condensed chapter's decision is wrong, say so explicitly and flag it — don't just build something else.

**When a future chapter is written at full depth, it supersedes any provisional decision made in this bootstrap phase.** Check `docs/decisions/` — every ADR marked `Provisional` is an open question waiting on a specific chapter; every ADR marked `Confirmed` is implementing something the Bible already decided. If a chapter you're about to rely on has since been rewritten at full depth, re-read it before trusting a `Confirmed` ADR that cites its condensed version.

## What MOTIQ is

An AI-powered roadside-assistance marketplace for India, connecting drivers to verified service providers. See `docs/product-overview.md` for a short orientation, `docs/handbook/volume-01-foundations/` for the full reasoning.

## Technology stack

- **Backend:** NestJS, TypeScript, Prisma, PostgreSQL + PostGIS + TimescaleDB, Socket.IO WebSocket gateway with a Redis scaling adapter (`apps/api`).
- **Admin console:** Next.js, TypeScript, Tailwind CSS (`apps/web`) — this is the internal ops/support console (Ch137), **not** the customer-facing product.
- **Mobile:** React Native (Expo), TypeScript (`apps/mobile`) — Customer and Provider apps as separate navigation stacks in one codebase (Volume VI, ADR 0008/ADR 0018). Never run through Metro or a real device/simulator in this environment — see `docs/roadmap.md`'s Reconciliation Notes.
- **Shared:** `packages/types` (TS enums/DTOs), `packages/config` (lint/tsconfig).

See `docs/architecture.md` for the full system design and `docs/decisions/` for why each choice was made.

## Cross-module communication

Modules react to each other through domain events (`common/events/domain-events.ts`, `@nestjs/event-emitter`), never by importing each other back-and-forth. `RequestModule` emits `RequestCreated`/`RequestCompleted`; `MatchingModule` and `PaymentModule` listen via `@OnEvent(...)`. If you need Module A to react to something in Module B without B depending on A, add an event — don't create the reverse import (ADR 0013).

## Architecture rules (non-negotiable, not just style preferences)

1. **Modular monolith, not microservices** (ADR 0001). One NestJS module per bounded context. No module reaches into another module's Prisma models/repositories directly — only through the owning module's exported service.
2. **PostGIS geography columns, not lat/lng floats**, for any nearest-provider or location query (Ch39, ADR 0002). The only permitted raw SQL in the codebase is the PostGIS nearest-provider lookup in the Provider/Matching repositories.
3. **`ServiceRequest.status` is only ever changed through the guarded state-machine function** (ADR 0004). Never a direct `update({ data: { status } })` from anywhere else in the codebase.
4. **Commission rate is a versioned database value, never a code constant or bare env var** (ADR 0003, Ch34). `DEFAULT_COMMISSION_RATE_PERCENT` in `.env` is a seed default only, read once at seed time — not read at request time by business logic.
5. **Every `Payment` stores `totalAmount`, `commissionAmount`, and `providerPayoutAmount` as separate columns** — never derive the split on read (Ch6, Ch57).
6. **Provider verification is a 4+-state enum, never a boolean** (`UNVERIFIED | PROVISIONAL | FULLY_VERIFIED | SUSPENDED | DELISTED`, ADR 0005, Ch98), and — as of Phase 4 (ADR 0016) — transitions only ever happen through `ProviderService.transitionVerificationStatus()`'s guarded state machine, the same discipline as rule 3.
7. **AI is additive, never load-bearing for the critical path** (ADR 0007). Every AI call site on the critical path (classification, ranking, ETA) needs a deterministic fallback as its designed default, not an error-handler afterthought. The SOS path (once built) never goes through the AI interface at all.
8. **`ServiceArea` scoping is real, not cosmetic** (ADR 0006). A request against one city's data must not be satisfiable from another city's session without an explicit cross-area permission — enforce this at the data-access layer, not just the controller. **Not yet implemented anywhere** (Phase 1 only built role-based RBAC) — see `docs/roadmap.md`'s Reconciliation Notes.
9. **Actor identity comes from `@CurrentUser()`, never from client-supplied body/query fields** (ADR 0011). A DTO must never contain `customerProfileId`, `providerProfileId`, or similar — derive it from the authenticated session in the controller, the way `RequestController.create()` does. Protect the route with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` first.

## Coding conventions

- TypeScript `strict` mode everywhere.
- Thin controllers: validate (DTO) → call one service method → return. Business logic lives in services, never in controllers, DTOs, or React components.
- No duplicated business logic — if the same rule (fare calculation, state transition, commission split) needs to exist in two places, it's a bug waiting to happen; extract it.
- No hardcoded secrets or money-related constants. Configuration or database — never a literal in code.
- No unnecessary dependencies — check `packages/config` and existing `apps/*/package.json` before adding a new library; prefer what's already in the stack.
- Don't bypass validation, guards, or the state-machine function "just this once" for convenience — if a legitimate path needs a new transition or permission, add it properly rather than routing around the check.

## Database rules

- Migrations only through Prisma (`prisma migrate dev` / `deploy`) — never a manual schema edit against a running database.
- Enums are Postgres enums, not free-text status columns (Ch38).
- Money is `Decimal`, never `Float` or JS `number`, anywhere in the money-handling path.
- The PostGIS columns/indexes are hand-written raw-SQL migrations layered on top of Prisma's generated migration — see `apps/api/prisma/migrations/` and `docs/decisions/0002-postgresql-prisma-postgis.md` before touching geospatial schema.

## API conventions

See `docs/api-conventions.md` in full before adding an endpoint. Highlights: `/api/v1/...` versioning, RFC 7807 error envelope, cursor-based pagination, `Idempotency-Key` required on money-movement/job-creation POST/PATCH endpoints.

## Frontend conventions

- `apps/web` (Next.js): accessible, responsive, real routes and a real data layer — not a single-page prototype. It talks to `apps/api` only through the versioned REST API, never direct DB access.
- Multi-language support (English/Hindi/Tamil, Ch16) and accessibility (Ch73, Ch132, Ch138) are strategic requirements referenced throughout the Bible — keep component architecture flexible enough to support them even where not yet implemented.

## Testing expectations

- Unit tests for all domain logic (state machine, fare/commission calculation, DTO edge cases) from the first module onward — not bolted on after the fact.
- Run: `npm run --workspace apps/api test`. See `docs/development.md`.

## Security rules

See `docs/security.md` in full. Highlights: no plaintext credentials ever; OTP for Customer/Provider, hashed passwords for Admin/Support; per-user rate limiting, not just gateway-level; every third-party call goes through an internal adapter (never a direct SDK call from domain code); webhook signatures always verified; any endpoint that collects a location must go through `ConsentService.requireConsent()` (Ch128) — never bypass this "just for a new endpoint," add the check the same way `RequestController.create()`/`ProviderController.updateOwnPresence()` do.

## Commands

```bash
npm install
cp .env.example apps/api/.env
npm run --workspace apps/api prisma:migrate
npm run --workspace apps/api start:dev   # backend, http://localhost:3001
npm run --workspace apps/web dev          # admin console, http://localhost:3000
npm run --workspace apps/mobile start     # Customer/Provider apps (Expo dev server)
npm run --workspace apps/api test
npm run lint
npm run format
```

## Environment notes specific to this machine

Docker was not found installed when this repository was bootstrapped — local development currently runs against a natively-installed PostgreSQL 18 (with the PostGIS extension enabled manually). `infrastructure/docker-compose.yml` is provided for environments that do have Docker, but don't assume it's been verified to work here — see `docs/development.md`.
