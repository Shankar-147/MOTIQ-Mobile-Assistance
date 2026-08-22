# apps/mobile — Customer & Provider Apps (placeholder)

This is where the Customer app and Provider app belong, per **Volume VI (Mobile Engineering)** of the MOTIQ Engineering Bible — not `apps/web`, which is the internal Admin & Operations Console (see `docs/decisions/0008-web-admin-console-vs-mobile-customer-provider-apps.md`).

## Why this is empty right now

This bootstrap phase is scoped to architecture and repository setup only (see the master bootstrap prompt's Section 12). No mobile code is written yet.

## What's still an open decision

**Flutter vs. React Native** — the Bible's condensed Ch64 names both as options without deciding between them. This should be resolved as its own ADR when Volume VI is written at full depth, weighing:

- **React Native** would let this app consume `packages/types` (shared TypeScript enums/DTOs) directly, keeping one source of truth for the API contract across `apps/api`, `apps/web`, and `apps/mobile`.
- **Flutter** would need a Dart-side equivalent of `packages/types`, or a schema-driven codegen step (e.g., generating Dart models from the Prisma schema or an OpenAPI spec derived from `apps/api`).

See ADR 0008 for the full reasoning. Do not start building here without first reading Ch64 (once written) and resolving this choice deliberately — not by default.
