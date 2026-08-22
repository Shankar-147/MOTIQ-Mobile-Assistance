-- Run this against the target database BEFORE the first `prisma migrate dev` /
-- `prisma migrate deploy`. The geography columns declared as Unsupported(...) in
-- schema.prisma (ProviderProfile.currentLocation, ServiceArea.boundary,
-- ServiceRequest.pickupLocation) need the postgis extension to already exist —
-- otherwise the generated migration fails with "type geography does not exist".
-- See docs/decisions/0002-postgresql-prisma-postgis.md.

CREATE EXTENSION IF NOT EXISTS postgis;
