# 0012 — FareConfig and the Pricing Engine's Distance Input

**Status:** Confirmed (fare = base + distance × surge − promotions is binding); **Provisional** (using match-time distance as the fare's distance input)
**Bible chapter to reconcile with:** Ch8 (Pricing Strategy, business view), Ch56 (Transparent Pricing Engine Implementation)
**Mission commitment served (Ch1 §1.4.2):** pricing infrastructure — MOTIQ owns fare computation as a system, never delegated to individual providers

## Context

Ch56 requires fare calculation to be "a pure function of (distance, base rate, surge multiplier, promotions) — fully unit-testable, fully reproducible for audit/dispute purposes." Ch8 requires the three components (base, distance, surge) to be individually visible before confirmation, the surge multiplier to be capped and explainable, and promotions to be a separate ledger line, never baked into the base fare. Neither chapter specifies where the "distance" input actually comes from at implementation time, or how fare constants are stored.

## Decision

`FareConfig` is a `ServiceArea`-scoped, versioned entity (`baseFare`, `perKmRate`, `maxSurgeMultiplier`, `effectiveFrom`) — the same pattern as `CommissionRate` (ADR 0003), for the same reason: Ch34 treats money-related constants as configuration, never code constants, and different cities may reasonably run different rates. `calculateFare()` (`fare.util.ts`) is a pure function taking `{distanceKm, baseFare, perKmRate, surgeMultiplier, maxSurgeMultiplier, promotionDiscount}` and returning every line item separately (`baseFare`, `distanceComponent`, `surgeMultiplier`, `subtotal`, `promotionDiscount`, `totalAmount`) — never collapsed into one number, satisfying Ch8's visibility requirement structurally (the API response shape has nowhere to hide a component).

**The distance input is the accepted `Assignment`'s `distanceMeters`** — the straight-line PostGIS distance between provider and pickup point, captured once at match time (see ADR 0013). This is reused rather than re-measured at job completion because no route/tracking distance source exists yet (Ch32's Maps API, Ch54's Real-Time Tracking are both future work) — using the match-time distance is honest about being an approximation (documented on the `Assignment.distanceMeters` field itself) rather than pretending a more precise number exists.

Surge is hardcoded to `1.00` (no surge) at every call site in this phase — there is no demand-forecasting system (Ch86) to compute a real value from. This is deliberately not treated as a placeholder to silently swap later; the fare engine's `maxSurgeMultiplier` cap and "must be explainable" requirement are already enforced in code (`SurgeCapExceededError`), so wiring in a real surge value later is additive, not a redesign.

## Alternatives Considered

- **A live route-distance API call at job completion (Ch32).** Rejected for this phase — no Maps provider is integrated at all (explicitly out of scope, see `docs/roadmap.md`'s earlier phases), and adding one just for this would be a large, premature scope increase.
- **Storing distance directly on `ServiceRequest` instead of `Assignment`.** Rejected — the distance is a property of a specific *offer* (this provider, at this moment, this far from the pickup), not of the request itself; a request that got reassigned three times has three different, meaningful distances, one per `Assignment`.

## Consequences

- If Ch54's Real-Time Tracking later produces a real traveled-route distance, `PricingService.calculateFareForServiceRequest()` is the one place that needs to change — it already isolates "where does the distance number come from" from the pure `calculateFare()` function itself.
- Every fare calculated in this phase is only as accurate as the straight-line provider-to-pickup distance at match time — this is a known, documented approximation, not a hidden one.
