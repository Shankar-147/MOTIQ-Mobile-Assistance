# MOTIQ — Product Overview

Full detail lives in `docs/handbook/volume-01-foundations/`. This is a short orientation, not a replacement for reading Chapters 1–7.

## What MOTIQ is

MOTIQ connects a driver experiencing a roadside problem to a nearby, verified service provider, quickly and transparently. It operates as a two-sided marketplace serving three actor types: **Customer**, **Provider**, **Admin**.

## The vision, restated for engineers

> "MOTIQ exists so that no driver has to guess whether help is coming, who is coming, what it will cost, or when it will arrive — and so every one of those answers is knowable within minutes of asking, from a provider MOTIQ has already verified." (Ch1 §1.3.4)

This is a decision function, not a slogan: where speed and honesty conflict — e.g., a fast-but-uncertain ETA vs. a slower-but-accurate one — **honesty wins**. A design that shows "I don't know yet, checking" serves the vision; a design that shows a fast but fabricated ETA does not.

## The mission

MOTIQ operates verification, matching, pricing, and communication infrastructure (Ch1 §1.4.2) — meaning:

- **Verification** — provider trust as a first-class system (Ch98), not a policy afterthought.
- **Matching** — automated, not manually dispatched, provider selection (Ch53). A human call-center dispatcher is explicitly out of scope as a long-term architecture, though valid as a cold-start bootstrapping tactic (Ch7).
- **Pricing** — MOTIQ owns fare computation as a system (Ch56), not delegated to individual providers.
- **Data compounding** — every completed job feeds future matching quality (Ch84) and product decisions (Ch139); this is core to the mission, not a later add-on.

## The breakdown taxonomy (binding, Ch2 §2.4.2)

`TOW, REPAIR, FUEL, FLAT_TYRE, BATTERY_JUMP, OTHER` — used verbatim in the domain model; see `docs/domain-model.md`.

## Trust is four separate things (Ch2 §2.5.2)

1. **Findability** — can the user find a provider at all, quickly?
2. **Identity trust** — does the user know who is coming, verified, before they arrive? (Ch98)
3. **Price trust** — does the user know what they'll pay before agreeing? (Ch56)
4. **Quality trust** — is there evidence (ratings, completed jobs) this specific provider is good? (Ch58)

The domain model represents each independently — a provider's verification status, rating, and price transparency on a request are three separate facts, never conflated into one "trust score."

## The real competitor

Not another app — the informal, word-of-mouth mechanic network (Ch3). It wins on existing personal trust and zero commission; it's weakest for travelers, people new to a city, and late-night breakdowns (Ch3 §3.3.3) — MOTIQ's best early wedge (Ch7 §7.4.2). MOTIQ's durable moat is the verified provider network and the job-by-job quality data it accumulates (Ch3 §3.6) — not the technology itself, and not being the cheapest option.

## Revenue model

Commission-per-completed-job as the primary stream (Ch5 §5.3.2, Ch6), with subscriptions and B2B fleet contracts as later-stage additions (Ch5 §5.3.5). The take rate is an illustrative, unconfirmed 15% (Ch6 §6.3.4) — **a stored, configurable value, never a hardcoded constant** (see ADR 0003). Every payment shows total charged, platform commission, and provider payout as separate, auditable fields.

## Cold-start strategy

City-by-city, four phases (Ch7 §7.6.2): **Supply Seeding → Controlled Demand → Liquidity Growth → Steady State**. Supply (providers) is recruited before demand (drivers) is marketed to, because a driver who finds no coverage leaves for good, while a provider can be recruited ahead of real job volume with the right incentives (reduced/zero early commission, guaranteed minimum earnings, fast payment, faster provisional-tier onboarding). This is why `ServiceArea` is a first-class, phase-aware entity in the domain model (ADR 0006), not a string field.

## What this phase does not decide

Exact take rate, exact matching timeout values, cloud provider, mobile framework (Flutter vs. React Native — ADR 0008), and the real AI provider are all explicitly open, tracked in `docs/decisions/` and the Reconciliation Notes at the end of `docs/architecture.md`'s companion roadmap.
