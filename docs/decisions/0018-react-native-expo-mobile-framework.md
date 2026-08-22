# 0018 — Mobile Framework: React Native (Expo), Resolving ADR 0008

**Status:** Provisional
**Bible chapters to reconcile with:** Ch64 (Mobile Architecture Overview), Ch65–74 (Volume VI, Mobile Engineering)

## Context

ADR 0008 (Phase 0) deliberately left Flutter vs. React Native open, since the condensed Ch64 entry names both without deciding, and Phase 0's scope was architecture/bootstrap only. Phase 5 is the first phase that actually builds `apps/mobile`, so the choice can no longer stay open.

Two facts settle it in this specific environment, on top of ADR 0008's own reasoning:

1. **`packages/types`** (shared TypeScript enums/DTOs, already consumed by `apps/api` and `apps/web`) is directly importable by a TypeScript React Native app with zero translation layer. Flutter would need a parallel Dart model layer or a codegen step from Prisma/OpenAPI — real work with no chapter yet specifying how.
2. **No Flutter SDK is installed in this development environment** (verified: `flutter --version` fails with "command not found"), while Node/npm are already the toolchain every other workspace in this monorepo uses. Node was confirmed present and network-connected (`npm view expo` resolved successfully) in this session.

## Decision

**React Native, via Expo's managed workflow**, as `@motiq/mobile` — a fourth npm workspace alongside `apps/api`, `apps/web`, `packages/types`, `packages/config`.

Expo specifically (not bare React Native CLI) because:
- Its JS/TS layer (navigation, state, API calls, WebSocket client) can be authored and type-checked in this environment without Xcode or Android Studio, neither of which is installed here.
- `expo-notifications` and `expo-location` give Ch70 (push) and Ch68 (background location) a single cross-platform API surface instead of separately maintained iOS/Android native modules — appropriate for a bootstrap-phase app with no dedicated mobile-native engineer yet.
- It doesn't foreclose ejecting to bare React Native later if a Ch68 background-location requirement (e.g. iOS's `UIBackgroundModes` fine-tuning) turns out to need something Expo's managed workflow doesn't expose.

One Expo project hosts both the Customer and Provider experience as separate navigation stacks (Ch65) selected post-login by the authenticated user's role, rather than two separate apps/binaries — Ch71 and Ch72 don't specify separate app-store listings, and one codebase keeps `packages/types` and the API-integration layer (Ch66) shared rather than duplicated.

## Alternatives Considered

- **Flutter.** Rejected for this phase specifically because the toolchain isn't installed here and there's no `packages/types`-equivalent sharing story without new code-generation infrastructure this phase doesn't have time to build responsibly. Not rejected on technical merit in general — if the founding team has iOS/Android engineers who already know Flutter, or perf/UI-fidelity requirements Ch64 later identifies as decisive, this should be revisited explicitly, not silently re-litigated.
- **Bare React Native CLI (no Expo).** Rejected for this phase — bare RN needs Xcode/Android Studio for anything beyond `tsc` type-checking, neither available here, and Expo's managed workflow gives push/location without hand-rolling native modules this phase has no way to compile or test anyway.
- **Two separate Expo apps (Customer, Provider).** Rejected — Ch71/Ch72 ask for "equal depth," not necessarily separate binaries; splitting later (once a real store-listing/branding decision is made) is a smaller change than merging two already-diverged codebases.

## Consequences

- `apps/mobile`'s TypeScript source has been type-checked (`tsc --noEmit`) in this session but **never run through Metro, never bundled, never opened in Expo Go or a simulator, and never built for a physical device** — no Android Studio/Xcode/Expo Go available in this environment. This is the same "designed and type-checked, not exercised against real infrastructure" caveat this codebase has applied to TimescaleDB, Redis, and Razorpay since earlier phases. Tracked in `docs/roadmap.md`'s Reconciliation Notes.
- If Flutter is chosen later after all (via an explicit future decision, not a silent reversal of this one), `apps/mobile` would need to be rebuilt from scratch — nothing here is shared with a hypothetical Dart codebase.
- The founding team should still treat the Flutter-vs-React-Native question as warranting its own explicit sign-off once real mobile engineers are hired (per Ch10's RACI, echoing ADR 0008's closing note) — this ADR documents why the bootstrap phase picked React Native, not that the question is closed forever.
