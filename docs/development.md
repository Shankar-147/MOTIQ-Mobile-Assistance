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

Because Docker isn't available in this environment, `infrastructure/docker-compose.yml` is provided for anyone who has Docker, but the **currently-working local setup uses the native PostgreSQL 18 install directly**.

**This bootstrap phase validated everything short of a live database connection**: `npm install`, `prisma generate`, the full `nest build`, `npm test` (51 tests across Phases 0–3), a full NestJS DI-graph boot check (catches circular-dependency/missing-provider errors `nest build` alone wouldn't), and a targeted check that the Redis WebSocket adapter degrades gracefully with no Redis available — all ran clean in this environment. Actually creating the `motiq_dev` database and running a live migration needs your own Postgres credentials (and, as of Phase 3, a TimescaleDB-enabled instance), which this session didn't have — do that part yourself with the steps below.

## Getting started

```bash
npm install                       # installs all workspaces
cp .env.example apps/api/.env     # fill in real local values, including your own DATABASE_URL,
                                   # JWT_ACCESS_SECRET, and ADMIN_SEED_PASSWORD

# 1. Create the database if it doesn't exist yet, e.g.:
#      psql -U postgres -c "CREATE DATABASE motiq_dev;"
# 2. Enable PostGIS AND TimescaleDB BEFORE the first migration — the schema's
#    geography columns and location_pings hypertable need both extensions to
#    already exist, or the migration fails. TimescaleDB is NOT bundled with a
#    vanilla Postgres install the way PostGIS often is — install it first if
#    you don't have it (see the .sql file's own comment):
psql -U postgres -d motiq_dev -f apps/api/prisma/pre-migration-postgis-extension.sql
psql -U postgres -d motiq_dev -f apps/api/prisma/pre-migration-timescaledb-extension.sql

# 3. Run the Prisma migration (creates every table, including the geography
#    columns as plain columns — see docs/decisions/0002-*.md for why they're
#    declared as Unsupported(...) in schema.prisma):
npm run --workspace apps/api prisma:migrate

# 4. Add the GiST spatial indexes Ch39/Ch41 require, and convert
#    location_pings into a TimescaleDB hypertable with a retention policy
#    (Ch40) — Prisma's schema DSL has no syntax for either:
psql -U postgres -d motiq_dev -f apps/api/prisma/post-migration-postgis-indexes.sql
psql -U postgres -d motiq_dev -f apps/api/prisma/post-migration-timescaledb-hypertable.sql

# 5. Seed the pilot ServiceArea + illustrative commission rate (Ch6 §6.3.4)
#    and an Admin account (admin@motiq.dev, password = ADMIN_SEED_PASSWORD):
npm run --workspace apps/api prisma:seed

npm run --workspace apps/api start:dev   # http://localhost:3001/api/v1/health
                                          # ws://localhost:3001/tracking (Ch75)
npm run --workspace apps/web dev          # http://localhost:3000
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
- The PostGIS extension and GiST indexes are the one exception, applied by hand via `apps/api/prisma/pre-migration-postgis-extension.sql` and `apps/api/prisma/post-migration-postgis-indexes.sql` (ADR 0002), since Prisma's schema DSL doesn't natively model `CREATE EXTENSION` or `USING GIST`. No `prisma migrate dev` has been run yet in this repository — `apps/api/prisma/migrations/` doesn't exist until the first person with real database credentials runs the steps in "Getting started" above.

## Environment variables

See `.env.example` at the repo root for the full list — copy it to `apps/api/.env` (see "Getting started" above). Never commit a real `.env` file — it's gitignored.
