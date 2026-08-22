# 0008 — Web Admin Console vs. Mobile Customer/Provider Apps

**Status:** Provisional — **flags a direct conflict between the master prompt and the Bible; see below**
**Bible chapter to reconcile with:** Ch64–74 (Volume VI, Mobile Engineering), Ch137 (Admin & Operations Console UX)

## Context — the conflict

The master bootstrap prompt's Section 4.1 directs a **Next.js** frontend as *the* frontend, described broadly ("a real application... rather than a single-page prototype") without distinguishing customer-facing from admin-facing. But the Bible dedicates an entire volume — **Volume VI, "Mobile Engineering (Flutter / React Native)"** — to the Customer (User) app and Provider app specifically, with Ch71 "User App Feature Architecture" and Ch72 "Provider App Feature Architecture" as their own chapters. Separately, Ch137 ("Admin & Operations Console UX") implies a web-based console for MOTIQ's own ops/admin staff, distinct from the two mobile apps. The repository itself is named **MOTIQ-Mobile-Assistance**, reinforcing that the primary product surface is mobile.

Per this project's own governing rule (master prompt Section 0): "Where this prompt and the Bible ever appear to conflict, the Bible wins, and you must flag the conflict explicitly rather than silently picking one." This ADR is that flag.

## Decision

For this bootstrap phase: `apps/web` is scaffolded as the **Admin & Operations Console** (Ch137) — a Next.js app for MOTIQ's internal ops/support staff (provider-verification review, manual dispatch override per Ch61) — not as the customer-facing product. `apps/mobile` is scaffolded as an empty placeholder with a README explaining that the Customer and Provider apps belong there, per Volume VI, and that the Flutter-vs-React-Native choice is explicitly left open pending Ch64's full architecture chapter. No customer-facing or provider-facing UI is built in this phase (consistent with the master prompt's Section 12 scope limit regardless of framework).

## Alternatives Considered

- **Build the customer/provider product as a Next.js web app, ignore Volume VI.** Rejected — would silently override a specific, deliberate Bible decision (an entire dedicated mobile volume) with the master prompt's more generic frontend direction, which Section 0 explicitly forbids doing silently.
- **Pick React Native now and start the mobile app.** Rejected as premature for this phase — Ch64 hasn't been written yet, no chapter has actually decided Flutter vs. React Native (the condensed entry names both as options), and Section 12 scopes this phase to architecture/bootstrap only, not feature building.

## Consequences

- `packages/types` (shared TypeScript types/enums) is directly consumable by `apps/api` and `apps/web` today; if React Native is later chosen for `apps/mobile`, it can consume the same package directly (TypeScript-native). If Flutter is chosen instead, `packages/types` cannot be shared as-is, and a Dart-side equivalent (or a schema-driven codegen step, e.g. from the Prisma schema or OpenAPI spec) would need to be introduced — this tradeoff should be weighed explicitly when Ch64 is written, not decided by this ADR.
- The founding team should treat this as an open item requiring their own sign-off (per Ch10's RACI, this kind of platform-shape decision needs joint product/engineering agreement) — it is flagged here, not resolved.
