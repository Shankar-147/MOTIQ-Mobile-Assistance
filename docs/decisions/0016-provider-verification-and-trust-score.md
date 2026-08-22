# 0016 — Provider Verification State Machine, KYC Review Workflow, and Trust Score

**Status:** Confirmed (guarded state machine, never a boolean; re-verification cadence with de-listing triggers; rating aggregation feeding a trust score); **Provisional** (the specific transition graph, cadence durations, trust-score formula, document-type taxonomy)
**Bible chapter to reconcile with:** Ch58 (Ratings, Reviews & Trust Score Service), Ch61 (Admin & Operations Service Design), Ch98 (Provider Verification & KYC Architecture)
**Mission commitment served (Ch1 §1.4.2):** verification infrastructure — Ch3 §3.6 names this MOTIQ's actual competitive moat, not a safety checkbox

## Context

Ch98 requires: two-tier verification status, never a boolean (already implemented Phase 0, ADR 0005); "ongoing re-verification cadence defined, with clear de-listing triggers for lapsed or failed re-checks" (not implemented until now). Ch58 requires rating aggregation and "provider trust-score computation, feeding Ch84's ranking model" — a concept distinct from the raw `ratingAverage` already implemented in Phase 0. Ch61 names "provider-verification workflow backend" as an Admin-facing responsibility. `docs/roadmap.md`'s Reconciliation Notes already flagged both "AdminProfile/Admin module minimal; no verification-review... UI yet" and "AuditLog wired to only two write paths... only the service method exists" as debt this phase closes.

## Decision

**Verification is now a real, guarded state machine** (`provider-verification-state-machine.ts`), the same discipline as `ServiceRequest`'s (ADR 0004): `UNVERIFIED → {PROVISIONAL, FULLY_VERIFIED, DELISTED}`, `PROVISIONAL → {FULLY_VERIFIED, SUSPENDED, DELISTED}`, `FULLY_VERIFIED → {SUSPENDED, DELISTED}`, `SUSPENDED → {PROVISIONAL, FULLY_VERIFIED, DELISTED}`, `DELISTED` terminal. `ProviderService.transitionVerificationStatus()` is the only method permitted to write the column — mirrors `RequestService.transition()` exactly.

**KYC document submission and review are split across two controllers by ownership, not by convenience**: `ProviderController` (self-service: submit, list own) vs. `AdminController` (review, tier transitions, the lapsed-verification sweep) — because Ch61 explicitly frames the *review workflow* as an Admin-owned backend, while the underlying `ProviderVerificationDocument` entity and the guarded state machine are Provider-owned data (ADR 0001's ownership rule). `AdminService`'s new methods are thin: they delegate the actual mutation to `ProviderService` and add what Admin uniquely owns — the audit trail (`AuditLog`, finally wired to a real write path, closing the exact gap Phase 0/1's Reconciliation Notes flagged as promised-but-unused).

**Document review does not automatically change the provider's overall verification tier.** Ch98 hasn't specified a "requires N approved documents of type X" rule, and inventing one here would be exactly the kind of silently-assumed business rule this project's binding-constraint discipline exists to prevent (see `docs/handbook/README.md`). An admin reviews individual documents, then makes a separate, explicit judgment call via `updateProviderVerificationStatus()` once they consider the file sufficient — two distinct actions, not one automated pipeline.

**Re-verification cadence** (Ch98, "clear de-listing triggers for lapsed... re-checks" — read literally: de-listing, not suspension, is the correct outcome for a lapse): `lastVerifiedAt` is set whenever a transition grants a working tier (`PROVISIONAL`/`FULLY_VERIFIED`). `ProviderService.sweepLapsedVerifications()` — the manual Admin-triggered stand-in for Ch62's future scheduler, identical pattern to `MatchingService.sweepExpiredOffers()` (ADR 0013) — finds every matching-eligible provider whose cadence window (`PROVIDER_PROVISIONAL_REVERIFICATION_DAYS`=30, `PROVIDER_FULLY_VERIFIED_REVERIFICATION_DAYS`=180, both provisional) has elapsed and transitions them straight to `DELISTED`.

**Trust score** (`trust-score.util.ts`, pure and tested) is deliberately *not* the raw `ratingAverage`: a Bayesian average pulls a low-job-count provider's score toward a neutral prior (3.5, weighted as if against 10 "phantom" jobs) so a single 5-star rating can't outrank hundreds of real completed jobs at 4.7 — then a verification-tier multiplier (`FULLY_VERIFIED`=1.0, `PROVISIONAL`=0.9, everything else=0) favors fully-verified providers, directly implementing Ch1 §1.6.2's Safety-layer preference. `ProviderService.recomputeTrustScore()` is called from `RatingService.submit()` (rating changed) and from `transitionVerificationStatus()` (tier changed) — the two things the formula actually depends on.

## Alternatives Considered

- **A simple threshold rule** ("3 approved documents → FULLY_VERIFIED") **instead of leaving the tier transition to explicit admin judgment.** Rejected — Ch98 doesn't specify document requirements, and a wrong guess here would be a real, binding-feeling business rule invented from nothing.
- **Lapsed re-verification → `SUSPENDED`, matching the general intuition that suspension is the "softer" first response.** Rejected in favor of following Ch98's own condensed wording ("de-listing triggers") literally, since the chapter is explicit about the word, not because de-listing is obviously the better policy — this is exactly the kind of provisional call Chapter 98's full-depth version should confirm or correct.
- **Recomputing trust score as a scheduled batch job instead of on every relevant write.** Rejected at this scale — a real-time recompute on the two events that actually change the inputs is simpler and always correct; batch recomputation is a scaling concern for a much larger provider base, not a Phase 4 one.

## Consequences

- `docs/decisions/README.md`'s document-type taxonomy (`DRIVING_LICENSE`, `VEHICLE_REGISTRATION`, `IDENTITY_PROOF`, `ADDRESS_PROOF`, `OTHER`) is this bootstrap phase's own invention — Ch98 hasn't specified one; revisit when it is.
- `fileUrl` is a client-supplied string reference, not a verified upload — no real file storage, virus scanning, or access-control integration exists yet (Ch94's secure-file-handling is future work). A malicious or bogus URL is not currently detected.
- The `sweepLapsedVerifications()` cadence check runs against every matching-eligible provider on each invocation — fine at bootstrap scale, would need indexing/batching consideration at real volume.
- Trust score is not yet consumed anywhere (Ch84's ranking model doesn't exist) — it's computed and stored, correctly, waiting for a consumer, the same "define now, wire in later" posture as the `ProviderAssigned`/`PaymentSettled`/`RatingSubmitted` events from ADR 0013.
