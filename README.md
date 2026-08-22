# MOTIQ

AI-powered roadside assistance platform for India. This repository is being built as a real, venture-grade production product, governed by the **MOTIQ Engineering Bible** — a 145-chapter handbook living in `docs/handbook/`.

## Status

This is the **architecture and bootstrap phase** — see `docs/architecture.md` for the system design, `docs/domain-model.md` for the data model, and `docs/decisions/` for every architecture decision made so far, tagged Confirmed (binding per the Bible) or Provisional (open, to be reconciled later). Full feature implementation has not started.

## Start here

1. `docs/handbook/00-table-of-contents.md` — the frozen 145-chapter structure.
2. `docs/handbook/volume-01-foundations/` — Chapters 1–7, read in full before making product/business decisions.
3. `docs/product-overview.md` — a short orientation to what MOTIQ is and why.
4. `docs/architecture.md` — the system architecture this bootstrap phase established.
5. `CLAUDE.md` — conventions for anyone (human or AI) working in this codebase.

## Repository structure

```
apps/
  api/     — NestJS backend (modular monolith, ADR 0001)
  web/     — Next.js Admin & Operations Console (ADR 0008)
  mobile/  — placeholder for Customer/Provider apps (Volume VI, ADR 0008)
packages/
  types/   — shared TypeScript enums/DTOs
  config/  — shared lint/tsconfig/prettier config
docs/
  handbook/   — the MOTIQ Engineering Bible
  decisions/  — Architecture Decision Records
infrastructure/ — Docker Compose for local Postgres+PostGIS/Redis
```

## Tech stack

NestJS + TypeScript (backend), Next.js + TypeScript + Tailwind (admin console), PostgreSQL + PostGIS + Prisma (data), Redis (caching, narrowly scoped — see `docs/architecture.md` §17). See `docs/decisions/` for the reasoning behind each choice.

## Development

See `docs/development.md`.
