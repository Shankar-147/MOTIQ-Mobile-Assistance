# 0002 — PostgreSQL + PostGIS + Prisma

**Status:** Confirmed (PostgreSQL + PostGIS requirement); **Provisional** (Prisma as the specific ORM)
**Bible chapter to reconcile with:** Ch37 (Conceptual Data Model), Ch38 (Logical & Physical Schema), Ch39 (Geospatial Data Architecture), Ch41 (Indexing)
**Mission commitment served (Ch1 §1.4.2):** matching infrastructure (nearest-provider queries are the single highest-frequency query path in the system)

## Context

Ch39 is explicit and non-negotiable: plain lat/lng decimal columns with application-side distance filtering are **disallowed** for any "nearest provider" query path. PostGIS `geography` columns with a GiST spatial index are required. The master prompt's own Section 6.7 independently arrives at the same conclusion. Separately, the environment assessment found PostgreSQL 18 already installed and running locally (`postgresql-x64-18` Windows service), and Prisma was the ORM named in the master prompt's Section 4.3.

## Decision

PostgreSQL (18, matching what's already running locally) with the PostGIS extension enabled, accessed through Prisma as the primary ORM/migration tool for the relational schema. Provider, ServiceArea, and ServiceRequest location columns are modeled as PostGIS `geography(Point, 4326)` / `geography(Polygon, 4326)` with a GiST index (Ch39, Ch41), not `Float` lat/lng columns. The columns themselves are declared directly in `schema.prisma` via `Unsupported("geography(...)")`, so Prisma's own migration generates them as part of the normal schema diff. Two things Prisma's schema DSL has no syntax for are handled by hand, outside `prisma migrate`: enabling the extension (`apps/api/prisma/pre-migration-postgis-extension.sql`, must run **before** the first migration, since the extension has to exist for the migration's `geography` column type to be valid) and the GiST indexes themselves (`apps/api/prisma/post-migration-postgis-indexes.sql`, run after). All application-level reads/writes of these columns go through raw queries (`$queryRaw`/`$executeRaw`) — the actual nearest-provider lookups and the point/polygon writes.

Each Unsupported geography field is declared **nullable** at the Prisma-client level even where every real-world record conceptually has one (e.g. `ServiceRequest.pickupLocation`) — a required Unsupported field makes Prisma's generated `create()` input unconstructable (there's no typed way to supply it), which broke compilation during this bootstrap phase. The actual value is set immediately after row creation via a raw-SQL `UPDATE` in the same service method (see `RequestService.create()`), so this is a client-typing workaround, not a real relaxation of the "every request has a pickup location" invariant.

## Alternatives Considered

- **Plain lat/lng + Haversine in application code.** Explicitly disallowed by Ch39. Would not scale past a small provider count and was flagged as the exact anti-pattern the chapter exists to prevent.
- **TypeORM instead of Prisma.** TypeORM has marginally better native support for custom column types (which suits PostGIS better), but Prisma's migration workflow, type generation, and NestJS ecosystem fit were judged to outweigh that, given the raw-SQL escape hatch above is a well-established pattern. This half of the decision is marked Provisional because it's a genuine judgment call the Bible's Ch38 hasn't weighed in on yet.
- **A separate geospatial microservice from day one.** Rejected per ADR 0001 — no justification yet for a service boundary here.

## Consequences

- Nearest-provider queries go through a dedicated repository method using `$queryRaw` with `ST_DWithin`/`ST_Distance`, not Prisma's query builder — this is the one deliberate, documented escape hatch from "no raw SQL," and it must stay confined to the Matching and Provider modules' repository layer.
- Local development requires the `postgis` extension to be installed alongside PostgreSQL (`CREATE EXTENSION IF NOT EXISTS postgis;`) — this is called out explicitly in `docs/development.md` since it's not automatic.
- Ch40's TimescaleDB requirement for raw GPS ping history (`location_pings`) is **not** implemented in this bootstrap phase's schema — it belongs to Ch54's Real-Time Tracking Service, which is out of scope per the master prompt's Section 12. This is listed in the Reconciliation Notes.
