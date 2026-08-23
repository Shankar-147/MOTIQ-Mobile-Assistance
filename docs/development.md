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

**As of Phase 8/9, this has been validated against a real, running database** in this same environment: PostGIS was installed (via Stack Builder), `motiq_dev` migrated and seeded, and `apps/api`/`apps/web`/`apps/mobile` have all run against it together — including `apps/mobile` on both a physical Android device and an Android emulator over the LAN. **TimescaleDB was never installed** — `location_pings` is a plain Postgres table, not a hypertable; skip the TimescaleDB steps below unless you install it yourself.

## Getting started

```bash
npm install                       # installs all workspaces
cp .env.example apps/api/.env     # fill in real local values, including your own DATABASE_URL,
                                   # JWT_ACCESS_SECRET, and ADMIN_SEED_PASSWORD

# 1. Create the database if it doesn't exist yet, e.g.:
#      psql -U postgres -c "CREATE DATABASE motiq_dev;"
# 2. Enable PostGIS (via Stack Builder, or `CREATE EXTENSION postgis;` if
#    your Postgres install already has the PostGIS files) BEFORE the first
#    migration — the schema's geography columns need it to already exist.
#    TimescaleDB is optional (see the caveat above) — install it first only
#    if you want location_pings to actually be a hypertable:
psql -U postgres -d motiq_dev -f apps/api/prisma/pre-migration-postgis-extension.sql
psql -U postgres -d motiq_dev -f apps/api/prisma/pre-migration-timescaledb-extension.sql   # optional, see above

# 3. `prisma migrate dev` also needs a SECOND, persistent database with
#    PostGIS enabled, for its shadow-database validation step (its default
#    throwaway shadow DB has no PostGIS, and Unsupported geography columns
#    fail to validate without it — see .env.example's SHADOW_DATABASE_URL note):
psql -U postgres -c "CREATE DATABASE motiq_shadow;"
psql -U postgres -d motiq_shadow -c "CREATE EXTENSION postgis;"

# 4. Run the Prisma migration (creates every table, including the geography
#    columns as plain columns — see docs/decisions/0002-*.md for why they're
#    declared as Unsupported(...) in schema.prisma). If this fails with a
#    missing "geography" type, the shadow DB's PostGIS got reset — re-run
#    step 3's CREATE EXTENSION, or use `prisma db push` for that one change:
npm run --workspace apps/api prisma:migrate

# 5. Add the GiST spatial indexes Ch39/Ch41 require, and (only if you
#    installed TimescaleDB) convert location_pings into a hypertable with a
#    retention policy (Ch40) — Prisma's schema DSL has no syntax for either:
psql -U postgres -d motiq_dev -f apps/api/prisma/post-migration-postgis-indexes.sql
psql -U postgres -d motiq_dev -f apps/api/prisma/post-migration-timescaledb-hypertable.sql   # optional, see above

# 5. Seed the pilot ServiceArea + illustrative commission rate (Ch6 §6.3.4)
#    and an Admin account (admin@motiq.dev, password = ADMIN_SEED_PASSWORD):
npm run --workspace apps/api prisma:seed

npm run --workspace apps/api start:dev   # http://localhost:3001/api/v1/health
                                          # ws://localhost:3001/tracking (Ch75)
npm run --workspace apps/web dev          # http://localhost:3000
npm run --workspace apps/mobile start     # Expo dev server (Ch64-74) — needs Expo/Xcode/Android
                                          # Studio tooling this environment doesn't have; see
                                          # docs/decisions/0018-*.md and apps/mobile/README.md
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
- The PostGIS extension and GiST indexes are the one exception, applied by hand via `apps/api/prisma/pre-migration-postgis-extension.sql` and `apps/api/prisma/post-migration-postgis-indexes.sql` (ADR 0002), since Prisma's schema DSL doesn't natively model `CREATE EXTENSION` or `USING GIST`. `apps/api/prisma/migrations/` now has a real history (`prisma migrate dev` was run as of Phase 8/9) — but note `prisma migrate dev`'s shadow-database step needs a **persistent** `SHADOW_DATABASE_URL` with PostGIS pre-enabled (see `.env.example`'s note), since Prisma's default throwaway shadow DB has no PostGIS and `Unsupported` geography columns fail to validate against it. If a schema change's shadow-DB validation fails with a missing `"geography"` type, re-run `CREATE EXTENSION postgis;` against the shadow database (Prisma resets its schema on every run) or use `prisma db push` for that one change instead.

## Environment variables

See `.env.example` at the repo root for the full list — copy it to `apps/api/.env` (see "Getting started" above). Never commit a real `.env` file — it's gitignored.
