# 0013 — Matching Dispatch, Reassignment, and the Event Backbone (Realized)

**Status:** Confirmed (dispatch/reassignment behavior, event-driven decoupling); **Provisional** (single-offer-only, no recurring scheduler, in-process transport)
**Bible chapter to reconcile with:** Ch31 (Event-Driven Backbone Design), Ch52 (Service Request Module Design), Ch53 (Matching & Dispatch Engine Design)
**Mission commitment served (Ch1 §1.4.2):** matching infrastructure — automated, not manually dispatched, provider selection

## Context

Ch53 requires candidate retrieval via the Ch39 geospatial index, a hard distance-sort fallback when no ranking model is available (Ch35/ADR 0007), and timeout-driven reassignment "to the next candidate, not a stuck request." Ch52 requires every status-changing code path to go through the single guarded state-machine function. ADR 0009 (Phase 0) defined the event catalog and an in-memory `DomainEventPublisher`/`Consumer` interface but left it unimplemented. Phase 2 needed Request, Matching, and Payment to react to each other (request created → start matching; job completed → settle payment) without violating ADR 0001's module-boundary rule, which ruled out `RequestModule` importing `MatchingModule` directly (that pairing alone would already be a cycle, since `MatchingModule` needs `RequestModule` for status transitions).

## Decision

**The event backbone is now real**, using `@nestjs/event-emitter` (Ch31's in-process adapter, per ADR 0009) registered once in `AppModule` via `EventEmitterModule.forRoot()`. `RequestService.create()` emits `RequestCreated`; `RequestService.transition()` emits `RequestCompleted` when the new status is `COMPLETED`. `MatchingService` and `PaymentService` each declare `@OnEvent(...)` listeners — neither `RequestModule` nor `PricingModule`/`PaymentModule` needs to import `MatchingModule` back, breaking what would otherwise be a cycle.

**Dispatch** (`MatchingService.dispatch()`): transitions `REQUESTED → MATCHING` on first entry only (idempotent-safe to call again mid-`MATCHING`, which is exactly the reassignment path), retrieves the nearest not-yet-offered eligible provider via `ProviderService.findNearestAvailableProvidersForRequest()` (a request-joined PostGIS query, excluding any provider with an existing `Assignment` for this request regardless of its outcome), creates an `Assignment`, transitions to `ASSIGNED`. No candidates → transitions to `EXPIRED` (Ch7 §7.5.3's "no provider available" outcome, structurally represented, not just a UX concern).

**Single-offer only** — the nearest candidate is offered, not the top N simultaneously. Broadcast-to-multiple remains a documented future per-`ServiceArea` config (ADR 0006) that this phase does not implement.

**Rejection** (`MatchingService.rejectOffer()`) immediately transitions `ASSIGNED → MATCHING` and calls `dispatch()` again — a real, synchronous reassignment retry, not a queued one.

**Timeout expiry** (`MatchingService.sweepExpiredOffers()`) finds every `OFFERED` `Assignment` past `MATCHING_OFFER_TIMEOUT_SECONDS`, marks it `TIMED_OUT` (via `updateMany` with the optimistic-lock `version` filter, so a real concurrent accept/reject always wins over a late sweep), and reassigns. **This is real reassignment logic with no recurring trigger** — it's exposed as an Admin-only endpoint (`POST /matching/sweep-expired`), a manual stand-in for the actual cron/queue trigger Ch62 (Background Jobs) will eventually own. Calling it is the only way expiry currently happens; nothing calls it automatically yet.

**`completedJobCount`** was silently wrong in Phase 0 (derived from rating count on `RatingService.submit()`, never from actual completions — harmless then, since `COMPLETED` was unreachable). Fixed here: `MatchingService` listens for `RequestCompleted` and increments the accepted assignment's provider's `completedJobCount` directly, since Matching owns the Assignment→Provider relationship and a job can complete without ever being rated.

## Alternatives Considered

- **`RequestModule` calling `MatchingService.dispatch()` directly from `RequestController.create()`.** Rejected — `MatchingModule` already depends on `RequestModule` (for `RequestService.transition()`), so the reverse import would be a true circular module dependency, not just an awkward one.
- **A real scheduler (e.g. `@nestjs/schedule`) for `sweepExpiredOffers()`.** Deliberately not added — introducing a cron dependency for one endpoint, in a phase explicitly scoped to "core transaction flow," was judged premature; Ch62 owns this properly later. The logic itself is real and tested via the manual endpoint; only the trigger is missing.

## Consequences

- The event catalog (`common/events/domain-events.ts`) now has real emitters and listeners for `RequestCreated`, `RequestCompleted`, `ProviderAssigned`, `ProviderTimedOut`, `PaymentSettled`, and `RatingSubmitted` — though `ProviderAssigned`, `PaymentSettled`, and `RatingSubmitted` currently have no listeners (defined for catalog completeness and future notification wiring, not because something consumes them today).
- A request can sit `MATCHING`/`ASSIGNED` indefinitely past its timeout until an Admin (or a future scheduler) calls the sweep endpoint — this is real, tracked debt, not a hidden gap; see `docs/roadmap.md`'s Reconciliation Notes.
- The production event transport (managed queue vs. self-hosted, per ADR 0009) is still unchanged by this ADR — only the in-process names/payloads are now real.
