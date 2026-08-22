# 0004 — Service Request State Machine

**Status:** Confirmed (state list and guarded-transition rule); **Provisional** (exact timeout durations, payment sub-state modeling)
**Bible chapter to reconcile with:** Ch19 (The Service Request State Machine), Ch52 (Service Request Module Design), Ch53 (Matching & Dispatch Engine Design)
**Mission commitment served (Ch1 §1.4.2):** matching infrastructure — automated, not manually dispatched

## Context

Ch19 states this is "the single most load-bearing artifact in the handbook" and gives the canonical state list verbatim, matching the master prompt's Section 7 starting shape exactly. It also mandates that transitions be enforced in code (a guarded transition function/library), not just convention, and that every other backend/mobile/notification chapter assume this exact vocabulary — no parallel status naming elsewhere.

## Decision

States: `REQUESTED, MATCHING, ASSIGNED, PROVIDER_ACCEPTED, PROVIDER_EN_ROUTE, ARRIVED, SERVICE_IN_PROGRESS, COMPLETED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_PROVIDER, EXPIRED, FAILED` — stored as a Postgres enum (`RequestStatus`), per Ch38's enum-vs-lookup-table rule for small, stable value sets. All transitions go through one guarded function (`ServiceRequestStateMachine.transition()`) in the Request module; nothing else is permitted to write `ServiceRequest.status` directly (enforced by only exposing a repository update method that takes a validated transition, not a raw status setter). Invalid transitions (e.g., `COMPLETED → MATCHING`) throw a domain error rather than silently succeeding.

Payment is modeled as a **separate** state machine on the `Payment` entity (`PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED`), linked to but not embedded in the request's status — a completed service and a settled payment are related but independent facts (a job can be `COMPLETED` with payment still `PENDING` during a gateway retry).

`MATCHING` timeout-driven reassignment or `EXPIRED` transition uses a provisional 90-second per-offer timeout (bounded within Ch1's revised vision — "knowable within minutes" — and Ch53's 15–90 second range), configurable per `ServiceArea` since broadcast-vs-single-offer dispatch is itself a Ch53 config-level decision tied to a city's Ch7 cold-start phase.

## Alternatives Considered

- **Convention-only status changes (any service can set `status` directly).** Explicitly rejected by Ch19 and Ch52 — makes invalid transitions structurally possible, the opposite of the chapter's stated goal.
- **Folding payment status into the same enum as request status** (e.g., `PAYMENT_PENDING` as a request state). Rejected — conflates two independently-varying facts and would make the request state machine harder to reason about; kept separate per this ADR.

## Consequences

- Every module that needs to react to a status change (Notification, Rating, Payment) subscribes to a `RequestStatusChanged` domain event rather than polling or reading `status` directly across module boundaries.
- The 90-second timeout, the broadcast-vs-single-offer default, and the exact reassignment retry count are all explicitly provisional — stored as `ServiceArea`-scoped configuration (not hardcoded), to be tuned once Ch53 and Ch121's load testing produce real numbers.
