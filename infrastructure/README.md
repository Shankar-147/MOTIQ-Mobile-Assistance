# Infrastructure

`docker-compose.yml` — local Postgres+PostGIS and Redis. **Unverified in this environment** (Docker was not found on PATH during the bootstrap's environment assessment — see `docs/development.md`). PostgreSQL 18 is already installed and running natively here, so native local development is the currently-working path.

No cloud provider is chosen yet (Ch101 not written) — see `docs/decisions/0009-managed-message-queue-for-event-backbone.md` for why the event backbone and eventual deployment target are deliberately left open.
