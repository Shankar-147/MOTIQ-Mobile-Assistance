# 0007 — AI as an Additive Capability, Never Load-Bearing for the Critical Path

**Status:** Confirmed
**Bible chapter to reconcile with:** Ch1 §1.6.2 (Safety success layer), Ch1 §1.8 (Volume VIII inherits a "non-negotiable obligation"), Ch35 (Resilience Patterns), Ch53, Ch84, Ch90 (AI Assistant Architecture), Ch91 (AI Governance)

## Context

Ch1 §1.8 states directly: "an AI system optimizing for helpful conversation must never be permitted to substitute for the SOS path." Ch35 requires the matching engine to have "a hard fallback to simple distance-sort if the model is unavailable" for the ranking model specifically, and calls this "non-negotiable per Ch1's safety commitments." Ch90 requires emergency-intent detection to run before any conversational response, redirecting to the SOS path rather than attempting to handle an emergency conversationally. The master prompt's Section 5 independently arrives at the same requirement.

## Decision

AI is defined at the architecture level as a pluggable capability behind an interface (`AiCapability` port, e.g. `classifyIssueCategory()`, `rankProviders()`, `predictEta()`, `assistantReply()`), owned conceptually by a future Ch80-aligned module, implemented in this bootstrap phase only as an interface with no concrete provider wired in. Every call site that would use an AI capability on the critical path (issue classification at request creation, provider ranking in Matching, ETA display) must have a deterministic, non-AI fallback defined in the same code path — not as an afterthought error handler, but as the designed default until/unless a real AI provider is integrated: category defaults to `OTHER` pending manual selection (Ch83's own fallback), ranking falls back to distance-sort (Ch84/Ch35), ETA falls back to a route-distance-based estimate with an explicit uncertainty range shown to the user (never false precision, per Ch85 and Ch1's revised vision). The SOS path (Ch55) never calls through the `AiCapability` interface at all — it is wired directly, so no future AI-assistant change can accidentally sit in front of it.

## Alternatives Considered

- **Build the AI Assistant chatbot now.** Explicitly out of scope per the master prompt's Section 5 and Section 12, and premature given Ch90's own requirements (grounding/RAG, cost-per-conversation caps, escalation path) aren't feasible to do well in a bootstrap phase.
- **No interface at all yet, add AI later by direct integration into services.** Rejected — would tightly couple the Matching/Request services to a specific AI provider from the start, which Section 5 of the master prompt and Ch32 (third-party integration adapters) both argue against.

## Consequences

- The core transaction flow (create request → match → complete) is fully testable and demoable with zero AI provider configured — this is the explicit success condition for this ADR, and should be re-verified any time AI integration work begins.
- A future AI-provider integration is additive: implement `AiCapability`, wire it in via configuration, and the fallback paths remain as the resilience layer (Ch35) rather than being deleted.
