-- Run this AFTER `prisma migrate dev` has created the location_pings table.
-- Converts it into a TimescaleDB hypertable partitioned on recordedAt, and
-- sets Ch40's example retention window (raw pings kept 90 days). See ADR
-- 0015 — downsampling (continuous aggregates for lower-resolution long-term
-- history) is NOT implemented here, only raw-data retention; downsampling
-- is real future work, not a silently-dropped requirement.

SELECT create_hypertable('location_pings', 'recordedAt', if_not_exists => TRUE);

-- Ch40's illustrative retention window — provisional, same status as the
-- commission rate and matching timeout defaults (see docs/decisions/).
SELECT add_retention_policy('location_pings', INTERVAL '90 days', if_not_exists => TRUE);
