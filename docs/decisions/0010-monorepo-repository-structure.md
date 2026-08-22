# 0010 — Monorepo Repository Structure

**Status:** Provisional
**Bible chapter to reconcile with:** Ch24 (Bounded Context Mapping), Ch48 (Backend Architecture Overview) — no chapter yet directly specifies repository/monorepo tooling

## Context

No Bible chapter (full or condensed) currently prescribes a repository layout or monorepo tool — this is left to this bootstrap phase, per the master prompt's Section 8.3.

## Decision

A monorepo using npm workspaces (npm 11 confirmed present; pnpm is not installed locally and Corepack-enabled pnpm was judged not worth the extra setup step for this phase):

```
apps/
  api/     — NestJS modular monolith (ADR 0001)
  web/     — Next.js Admin & Operations Console (ADR 0008)
  mobile/  — placeholder pending Ch64 (ADR 0008)
packages/
  types/   — shared TypeScript enums/DTOs (RequestStatus, breakdown taxonomy, etc.)
  config/  — shared ESLint/TypeScript/Prettier config
docs/
  handbook/   — the Bible, split per docs/handbook/README.md
  decisions/  — this ADR log
infrastructure/  — docker-compose for local Postgres+PostGIS/Redis
scripts/
```

## Alternatives Considered

- **Separate repositories per app.** Rejected — the master prompt's Section 8.3 recommends a monorepo, and `packages/types` needs to be shared between `apps/api` and `apps/web` without a publish step at this stage.
- **pnpm or Turborepo.** Not rejected outright, just deferred — npm workspaces is sufficient for the current app count (3) and avoids introducing a tool not yet verified in this environment; revisit if build-graph/caching needs grow past what npm workspaces handles well.

## Consequences

- Adding a new bounded-context-aligned package (e.g., extracting Matching per Ch27) later means adding a new `apps/` or `packages/` entry, not restructuring the whole repo.
- Because Docker was not found in this environment during the bootstrap's environment assessment, `infrastructure/docker-compose.yml` is provided but unverified locally — noted in Reconciliation Notes.
