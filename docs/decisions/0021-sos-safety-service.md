# 0021 — SOS & Safety Service (Ch55)

**Status:** Confirmed (bypass-priority, no-delay rate-limiting exemption); Provisional (everything else — alert lifecycle, emergency-services-number config, no real emergency-service integration)
**Bible chapter to reconcile with:** Ch55 (SOS & Safety Service Design), Ch1 §1.8, Ch90, ADR 0007

## Context

ADR 0007 (Phase 0) established the binding principle that AI must never substitute for the SOS path, and that "the SOS path (Ch55) never goes through the AiCapability interface at all — it is wired directly." Every phase since has carried a Reconciliation Notes entry saying Ch55 itself doesn't exist. Phase 6's AI Assistant (ADR 0019) built a real emergency-intent pre-filter but could only tell a user to call real emergency services — it had nothing to escalate to internally. This phase builds that missing piece.

## Decision

**A real `SosAlert` entity and `SosModule`**, deliberately scoped as an internal escalation to MOTIQ's own Admin/Support team — not a dispatch to police/ambulance, which no software integration in this bootstrap can actually perform. Every trigger response explicitly tells the user to contact real emergency services themselves; the alert is additive support, never a claimed substitute.

- **`POST /sos/trigger`** (Customer/Provider): creates a `TRIGGERED` alert and fans out a `CRITICAL`-tier push notification to every active Admin/Support user, immediately. Location and `serviceRequestId` are both optional — an alert with no location is still a real alert, per Ch55's "never delay a genuine trigger" spirit extended to missing data, not just rate limits.
- **`@SkipThrottle()`** on the trigger route — Ch55's binding "rate-limiting must never delay a genuine trigger" applied literally: this route is fully exempt from the global per-user limiter (ADR 0020), not just given a generous limit.
- **No consent gate** on the trigger route either, for the same reason — `ConsentService.requireConsent()` (Ch128) is deliberately never called here, even though the route collects a location. Blocking a genuine emergency behind a consent prompt would be actively dangerous; this is the one deliberate, documented exception to CLAUDE.md's "any endpoint that collects a location must go through `ConsentService.requireConsent()`" rule.
- **A guarded alert lifecycle** (`sos-state-machine.ts`, mirroring Ch19/Ch98's discipline): `TRIGGERED → {ACKNOWLEDGED, RESOLVED, FALSE_ALARM}`, `ACKNOWLEDGED → {RESOLVED, FALSE_ALARM}`, both terminal states final. Simpler than the request/verification state machines on purpose — a duplicate or test alert doesn't need a forced "acknowledged" step before closing.
- **The AI Assistant now files a real alert** (`AiService.sendMessage()`'s emergency branch): on `detectEmergencyIntent()`, it calls `SosService.trigger()` — a **one-way** dependency (`AiModule` imports `SosModule`, never the reverse) that preserves ADR 0007's binding rule for the *primary* trigger path (the mobile SOS button, wired directly to `SosService`, has zero dependency on anything AI-related). Filing the alert is wrapped in try/catch and never blocks the assistant's reply — if it fails, the user still gets told to call real emergency services.
- **Admin Console SOS queue** (`/sos`, Ch137): every Admin/Support login sees an active-alert count on the dashboard, with acknowledge/resolve/false-alarm actions — the alert exists, but Ch55's "highest-priority path" is only real if someone can actually see and act on it.
- **Mobile `SosButton`**: a persistent, always-reachable button on the Customer's tracking screen and the Provider's active-job screen — one confirmation tap (not a multi-step flow), fires even if location permission was never granted.

## Alternatives Considered

- **Integrate with a real emergency-dispatch API.** Rejected — no such integration exists or is realistic to fabricate in a bootstrap session; claiming one would be actively dangerous (a user might trust a fake "police notified" message instead of calling 112 themselves).
- **Gate SOS behind the same rate limit/consent checks as everything else, for consistency.** Rejected — Ch55's binding constraint is explicit that this path is the one deliberate exception, not an oversight to fix later.
- **Let SosModule depend on AiModule (e.g., use the classifier to triage alert severity).** Rejected outright — this is exactly the coupling ADR 0007 forbids. The dependency only ever flows AI → SOS, never the reverse.

## Consequences

- `EMERGENCY_SERVICES_NUMBER` defaults to India's "112" and is env-configurable, not hardcoded — but is still this bootstrap's own invented default, not sourced from any real MOTIQ ops policy.
- No SMS-based SOS fallback for offline devices (Ch67's other named requirement) — the trigger endpoint needs connectivity; a true SMS fallback needs native platform integration this phase doesn't build (tracked in Reconciliation Notes, same as before).
- No trusted-contacts notification (a common feature in comparable real apps) — out of scope, not named as binding by Ch55's condensed entry.
- The SOS button is not on every screen (only the two highest-risk moments: tracking a request, and an active job) — a persistent global-nav placement is a real, deferred improvement.
- `docs/threat-model.md`'s "fake SOS" attack scenario now has a real target to reconsider: a malicious user could file repeated false alerts, at no cost since rate-limiting is deliberately skipped here. This is an accepted tradeoff per Ch55's binding constraint, not an oversight — but worth flagging for whenever real abuse patterns emerge (the `FALSE_ALARM` status exists specifically to let Admin/Support build a future abuse-detection signal from it).
