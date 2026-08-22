# 0005 — Two-Tier Provider Verification Status

**Status:** Confirmed
**Bible chapter to reconcile with:** Ch7 §7.3.2 (cold-start fast-track onboarding), Ch98 (Provider Verification & KYC Architecture)
**Mission commitment served (Ch1 §1.4.2):** verification infrastructure — provider trust as a first-class system, and Ch3 §3.6's competitive moat

## Context

Ch98 states plainly: "two-tier verification status required: `PROVISIONAL` (fast-track, per Ch7's cold-start needs) and `FULLY_VERIFIED` — never a single boolean." Ch7 §7.3.2 explains why: full KYC/background-check verification takes weeks, and early providers in a cold-start city will lose interest before their first job if onboarding is that slow, so a faster initial tier is needed, reconciled with full verification shortly after.

## Decision

`ProviderVerificationStatus` is its own enum on the `Provider` entity, not a boolean: `UNVERIFIED, PROVISIONAL, FULLY_VERIFIED, SUSPENDED, DELISTED`. A `Provider` can be matched to a `ServiceRequest` while `PROVISIONAL` (subject to a `ServiceArea`-level policy on whether provisional providers are eligible for matching at all during a given cold-start phase — see ADR 0006), but every `Payment`/`Assignment` record retains which verification tier the provider held *at the time the job ran* (not just the provider's current status), because Ch1 §1.6.2's Safety success layer explicitly tracks "percentage of completed jobs performed by a provider who passed the full verification workflow, as opposed to jobs completed during any provisional or degraded-verification period" as a primary signal.

## Alternatives Considered

- **A single `isVerified: boolean`.** Explicitly disallowed by Ch98. Would make Ch1's Safety-layer signal (fully-verified vs. provisional job ratio) impossible to compute and would collapse Ch7's fast-track/full-verification distinction that the cold-start strategy depends on.
- **Storing only current status, not point-in-time status on the job record.** Rejected — a provider who was `PROVISIONAL` when a job ran and is `FULLY_VERIFIED` today would make historical safety reporting silently wrong if only current status were queryable.

## Consequences

- The Provider module owns re-verification cadence and de-listing triggers (Ch98) — not designed in this bootstrap phase, but the enum and the point-in-time snapshot on `Assignment` are in place so that work has somewhere to land.
- Any UI or matching-eligibility logic that today only checks "is this provider usable" must check verification status against `ServiceArea` policy, not assume `FULLY_VERIFIED` is the only usable state.
