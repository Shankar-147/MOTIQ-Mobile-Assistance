-- Run this against the target database BEFORE `prisma migrate dev` creates
-- the location_pings table (Ch40). TimescaleDB is a SEPARATE extension from
-- PostGIS (see pre-migration-postgis-extension.sql) — it is NOT bundled with
-- a vanilla PostgreSQL install the way PostGIS often is, and its
-- availability in this environment has not been verified. See ADR 0015.
--
-- If this extension isn't installed on your PostgreSQL server, install it
-- first (https://docs.timescale.com/self-hosted/latest/install/) — there is
-- no in-database fallback; the CREATE EXTENSION below will simply fail.

CREATE EXTENSION IF NOT EXISTS timescaledb;
