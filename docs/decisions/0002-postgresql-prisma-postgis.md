# 0002 — PostgreSQL + PostGIS + Prisma

**Status:** Confirmed (PostgreSQL + PostGIS requirement); **Provisional** (Prisma as the specific ORM)
**Bible chapter to reconcile with:** Ch37 (Conceptual Data Model), Ch38 (Logical & Physical Schema), Ch39 (Geospatial Data Architecture), Ch41 (Indexing)
**Mission commitment served (Ch1 §1.4.2):** matching infrastructure (nearest-provider queries are the single highest-frequency query path in the system)

## Context

Ch39 is explicit and non-negotiable: plain lat/lng decimal columns with application-side distance filtering are **disallowed** for any "nearest provider" query path. PostGIS `geography` columns with a GiST spatial index are required. The master prompt's own Section 6.7 independently arrives at the same conclusion. Separately, the environment assessment found PostgreSQL 18 already installed and running locally (`postgresql-x64-18` Windows service), and Prisma was the ORM named in the master prompt's Section 4.3.

## Decision

PostgreSQL (18, matching what's already running locally) with the PostGIS extension enabled, accessed through Prisma as the primary ORM/migration tool for the relational schema. Provider and ServiceRequest location columns are modeled as PostGIS `geography(Point, 4326)` with a GiST index (Ch39, Ch41), not `Float` lat/lng columns. Because Prisma does not natively model PostGIS geography types or GiST indexes, the geospatial columns and their indexes are added via a raw-SQL Prisma migration (`prisma migrate dev --create-only` + hand-written SQL), with the column exposed to application code through `Unsupported("geography(Point, 4326)")` in `schema.prisma` and raw queries (`$queryRaw`) for the actual nearest-provider lookups.

## Alternatives Considered

- **Plain lat/lng + Haversine in application code.** Explicitly disallowed by Ch39. Would not scale past a small provider count and was flagged as the exact anti-pattern the chapter exists to prevent.
- **TypeORM instead of Prisma.** TypeORM has marginally better native support for custom column types (which suits PostGIS better), but Prisma's migration workflow, type generation, and NestJS ecosystem fit were judged to outweigh that, given the raw-SQL escape hatch above is a well-established pattern. This half of the decision is marked Provisional because it's a genuine judgment call the Bible's Ch38 hasn't weighed in on yet.
- **A separate geospatial microservice from day one.** Rejected per ADR 0001 — no justification yet for a service boundary here.

## Consequences

- Nearest-provider queries go through a dedicated repository method using `$queryRaw` with `ST_DWithin`/`ST_Distance`, not Prisma's query builder — this is the one deliberate, documented escape hatch from "no raw SQL," and it must stay confined to the Matching and Provider modules' repository layer.
- Local development requires the `postgis` extension to be installed alongside PostgreSQL (`CREATE EXTENSION IF NOT EXISTS postgis;`) — this is called out explicitly in `docs/development.md` since it's not automatic.
- Ch40's TimescaleDB requirement for raw GPS ping history (`location_pings`) is **not** implemented in this bootstrap phase's schema — it belongs to Ch54's Real-Time Tracking Service, which is out of scope per the master prompt's Section 12. This is listed in the Reconciliation Notes.
