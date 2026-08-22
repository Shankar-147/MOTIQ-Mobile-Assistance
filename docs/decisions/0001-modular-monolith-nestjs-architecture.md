# 0001 — Modular Monolith, NestJS

**Status:** Confirmed
**Bible chapter to reconcile with:** Ch25 (Monolith vs. Microservices ADR), Ch26 (Modular Monolith Internal Design), Ch48 (Backend Architecture Overview)
**Mission commitment served (Ch1 §1.4.2):** matching, pricing, verification infrastructure — all as one coherent, operable system a 3-person team can actually run

## Context

The master bootstrap prompt asked this phase to make the monolith-vs-microservices call itself, as a provisional first draft. The Bible's condensed Ch25 already makes this call explicitly and gives the reasoning: a 3-person team and unproven traffic do not justify microservices' operational overhead. This ADR exists to record how the bootstrap implements that decision, not to re-derive it.

## Decision

Single NestJS deployable (`apps/api`) structured as a modular monolith. One NestJS module per bounded context, matching Ch24's context map: `Identity`, `ServiceArea`, `Provider`, `Request` (Service Request lifecycle), `Matching`, `Payment`, `Notification`, `Rating`, `Admin`. Per Ch26: no module reaches directly into another module's Prisma models/repositories — cross-module access only through the owning module's exported service interface. A small shared kernel (`src/common`) holds genuinely cross-cutting concerns only: the auth/request context and the `Money` value object (paise-precision, per Ch14's rounding rule).

## Alternatives Considered

- **Microservices from day one.** Rejected per Ch25 — no team-ownership or independent-scaling pressure exists yet to justify the deployment/operability cost.
- **Unstructured single Nest app (no module boundaries).** Rejected — would silently violate Ch24's bounded-context map and make the Ch27 extraction roadmap (Matching first, then Notifications, then AI/ML serving) impossible to execute later without a rewrite.

## Consequences

- Extraction later (Ch27) is a refactor of module boundaries into deployables, not a rewrite, because the boundaries already exist as enforced module exports.
- A bug or load spike in one module (e.g., Matching) can still affect the whole process, since it's one deployable — acceptable at current scale per Ch25, revisited when Ch27's trigger conditions (team ownership conflict, independent scaling need, deployment-blast-radius incident) actually occur.
- Every new module must declare its Prisma models as owned and never be imported from another module's repository layer directly — this is a code-review rule, not just documentation, until Ch26 formalizes tooling (e.g., lint boundaries) for it.
