-- Run this AFTER `prisma migrate dev` has created the geography columns.
-- Prisma's schema DSL has no syntax for "USING GIST", so the spatial indexes
-- Ch39/Ch41 require are added by hand here — this is the one documented
-- raw-SQL migration step outside Prisma's own migration files.
-- See docs/decisions/0002-postgresql-prisma-postgis.md.

CREATE INDEX IF NOT EXISTS provider_profiles_current_location_gist
  ON provider_profiles USING GIST ("currentLocation");

CREATE INDEX IF NOT EXISTS service_requests_pickup_location_gist
  ON service_requests USING GIST ("pickupLocation");

CREATE INDEX IF NOT EXISTS service_areas_boundary_gist
  ON service_areas USING GIST (boundary);
