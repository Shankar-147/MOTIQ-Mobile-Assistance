# MOTIQ Development Guide

## Environment (as assessed during bootstrap, 2026-08-22)

| Tool | Status |
|---|---|
| Node.js | v22.19.0 — present |
| npm | 11.16.0 — present |
| yarn | 1.22.22 — present (unused; npm workspaces chosen, ADR 0010) |
| pnpm | not installed (Corepack 0.34.0 is present and could enable it if needed later) |
| git | 2.51.0 — present; global user already configured |
| Docker / Docker Compose | **not found on PATH** — local dev currently uses the natively-installed PostgreSQL instead (see below) |
| PostgreSQL | 18.0 — installed and running locally as a Windows service (`postgresql-x64-18`) |
| Python | not found — not required for this stack |

Because Docker isn't available in this environment, `infrastructure/docker-compose.yml` is provided for anyone who has Docker, but the **currently-working local setup uses the native PostgreSQL 18 install directly**. Install the PostGIS extension for that instance before running migrations:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Getting started

```bash
npm install                       # installs all workspaces
cp .env.example apps/api/.env     # fill in real local values
npm run --workspace apps/api prisma:migrate   # applies schema + the PostGIS raw-SQL migration
npm run --workspace apps/api start:dev
npm run --workspace apps/web dev
```

## Repository structure

See `docs/decisions/0010-monorepo-repository-structure.md`.

## Coding conventions

- TypeScript everywhere; `strict` mode on in every `tsconfig.json`.
- Controllers are thin: validate input (DTO), call one service method, return. Business logic lives in services; data access lives in repositories. No module reaches into another module's repository directly (ADR 0001).
- No hardcoded secrets, commission rates, or other money-related constants (ADR 0003, Ch34) — configuration or database, never a literal.
- No raw SQL outside the documented PostGIS escape hatch (ADR 0002) — everything else goes through Prisma's query builder.
- State transitions on `ServiceRequest.status` only ever happen through the guarded state-machine function (ADR 0004) — never a direct `prisma.serviceRequest.update({ data: { status ... } })` from arbitrary code.

## Testing

- Unit tests (Jest) for all domain logic: state-machine transitions, fare/commission calculation, DTO validation edge cases.
- Run: `npm run --workspace apps/api test`.
- Full test-pyramid tooling (E2E, load, security testing — Ch118–125) is anticipated, not built out, in this bootstrap phase.

## Linting / formatting

- ESLint + Prettier, shared config in `packages/config`. Run: `npm run lint` / `npm run format` from the repo root (workspace-aware).

## Database migrations

- Always through Prisma migrations (`prisma migrate dev` locally, `prisma migrate deploy` in CI/production) — never a manual schema edit against a running database.
- The PostGIS geography columns and their GiST indexes are added via a hand-written raw-SQL migration step (see `apps/api/prisma/migrations/`, and ADR 0002) since Prisma's schema DSL doesn't natively model PostGIS types.

## Environment variables

See `.env.example` at the repo root and `apps/api/.env.example` for the full list. Never commit a real `.env` file — it's gitignored.
