# 0003 — Configurable Commission Rate, Auditable Payment Split

**Status:** Confirmed
**Bible chapter to reconcile with:** Ch6 (Unit Economics), Ch34 (Configuration & Secrets Management), Ch57 (Payment Processing Service Design)
**Mission commitment served (Ch1 §1.4.2):** pricing infrastructure — MOTIQ owns fare computation and commission as a system, not a policy afterthought

## Context

Ch6 §6.3.4 uses an illustrative 15% take rate explicitly marked provisional pending Ch4's provider research — the real number is expected to change, possibly by city or by cold-start phase (Ch7 §7.3.2's reduced/zero commission period for early providers). Ch34 states plainly: "all money-related constants (commission rate, surge caps) are configuration, not code constants." Ch57 requires every payment record to store total charged, platform commission, and provider payout as separate, auditable fields.

## Decision

The commission rate is a stored, versioned configuration value, not a code constant or a single global `.env` value — modeled as a `CommissionRate` table scoped to a `ServiceArea` (see ADR 0006) with an effective-from timestamp, so a city can run its own rate (including the Ch7 cold-start zero/reduced rate) without a code deploy. Every `Payment` record stores `totalAmount`, `commissionAmount`, and `providerPayoutAmount` as three separate columns (all `Decimal`, paise-precision, per Ch14's rounding rule — no floats for money), plus a foreign key to the `CommissionRate` row that produced the split, so any historical payment's split is reconstructable and auditable without recomputing against today's rate.

## Alternatives Considered

- **A single `COMMISSION_RATE` environment variable.** Rejected — satisfies "not hardcoded" but not "configurable per city/phase," which Ch7's cold-start playbook requires, and a bare env var gives no audit trail of what rate applied to a historical payment once it's changed.
- **Storing only the commission percentage on the Payment record, computing amounts on read.** Rejected — Ch57 requires the amounts themselves to be stored, not derived, so a dispute or audit doesn't depend on re-running today's fare logic against old data.

## Consequences

- Changing a city's commission rate is a data write (a new `CommissionRate` row with a future `effectiveFrom`), not a deploy — directly enables Ch7 Phase 3's "reduced-commission incentives phasing out" without an engineering release.
- The Payment module owns `CommissionRate`; every other module reads it only through Payment's service interface (per ADR 0001's module-boundary rule).
- Every commission-rate change is itself worth an audit-log entry (Ch61's Admin service, Ch99's fraud posture) — not implemented in this bootstrap phase, listed in Reconciliation Notes.
