# 0006 — Service Area / City Scoping

**Status:** Provisional
**Bible chapter to reconcile with:** Ch7 (Marketplace Dynamics & Cold-Start Strategy) — no full architecture chapter exists yet for this entity specifically; closest condensed references are Ch9 ("how many cities are in which phase" as a core planning input) and Ch53 (broadcast-vs-single-offer as a config-level, per-city decision)

## Context

Ch7 §7.6.2 defines a four-phase city launch playbook (Supply Seeding → Controlled Demand → Liquidity Growth → Steady State) and states that commission rates (§7.3.2), matching behavior (Ch53), and provider-verification speed all vary by which phase a city is in. Neither Ch7 nor any condensed chapter yet specifies a data model for "city" — this ADR proposes one, to be reconciled once a full architecture chapter addresses it directly.

## Decision

A first-class `ServiceArea` entity (not a bare string city name on `User`/`Provider`) with: a name, a geographic boundary (PostGIS polygon, per ADR 0002/Ch39's geofencing note), a `launchPhase` enum (`SUPPLY_SEEDING, CONTROLLED_DEMAND, LIQUIDITY_GROWTH, STEADY_STATE`), and it owns the `CommissionRate` (ADR 0003) and matching-policy configuration (broadcast vs. single-offer, provisional-provider eligibility) for that area. Every `Provider` and every `ServiceRequest` references a `ServiceArea`. A request is only matched against providers in the same `ServiceArea`.

## Alternatives Considered

- **A plain string `city` field on Provider/Request.** Rejected — can't hold per-city configuration (commission, matching policy, launch phase) or a real geographic boundary, and would need a migration to a real entity the moment Ch7's playbook needed to be operationalized, which is now.
- **Encoding launch phase as a global feature flag rather than a per-`ServiceArea` field.** Rejected — Ch7 is explicit that different cities are in different phases simultaneously; a global flag can't represent that.

## Consequences

- Onboarding a new city (Ch7's playbook) becomes a data operation (create a `ServiceArea`, set its initial phase and commission rate) rather than a code change.
- This ADR is Provisional specifically because the *exact* shape of matching-policy configuration per phase (e.g., precisely which knobs Ch53's broadcast-vs-single-offer decision needs) isn't specified anywhere yet — the bootstrap schema includes the minimum needed to be non-blocking, and should be revisited the moment Ch53 or a dedicated future chapter formalizes it.
