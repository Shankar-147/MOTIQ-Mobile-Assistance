# 0023 — Ask MOTIQ: a tool-calling customer agent, plus AI triage from text and photo

**Status:** Provisional
**Bible chapter to reconcile with:** Ch80 (ML architecture overview), Ch90 (AI Assistant), Ch83 (Classifier), ADR 0007, ADR 0019
**Mission commitment served (Ch1 §1.4.2):** matching (a better-described request reaches the right provider faster)

## Context

ADR 0019 built the AI serving module with a keyword issue classifier, a weighted provider ranker and a FAQ-level assistant (Anthropic adapter, keyword fallback). Three gaps remained: the mobile app had no AI surface at all; the assistant could only answer fixed FAQ-style questions — it had no access to the customer's own vehicles, service history or requests, and could not act; and issue triage was keyword-only, English-only and text-only.

A sibling project (DriveOps, a single-vehicle owner agent) demonstrates a useful pattern: an LLM tool-calling loop where every tool is tiered GREEN (read), YELLOW (write, needs confirmation) or RED (never executed). Its confirmation, however, is a `confirmed: true` argument the *model itself* supplies, and its tools take a `vehicle_id` from the model — fine for a single-user prototype, unsafe for a multi-user marketplace.

## Decision

Three features, all optional on top of the existing flow and all degrading to a deterministic fallback (ADR 0007):

1. **Ask MOTIQ agent** — `AgentModule` (`apps/api/src/modules/agent/`), customers only. A bounded tool-calling loop (max 6 model calls per message, last 20 messages of history) over `VehicleService` and `RequestService` through their exported services only (ADR 0001). Tools: list vehicles, maintenance status, service history, recent requests and request status, reminder settings, reviewed safety guidance, and a "suggest help request" button (all GREEN); add a maintenance record and change reminder lead time (YELLOW). There are no RED tools: payments, refunds, cancellations and account changes are not offered to the model at all.
2. **Free-text triage** — `POST /ai/classify-issue` now asks a model (any language) and returns type, confidence, urgency, summary and a safety tip; if no model is configured or the reply is unusable, the existing keyword classifier answers. The customer still always chooses `issueType` (Ch83's binding fallback).
3. **Photo triage** — `POST /ai/diagnose-photo` sends a downsized photo to a vision-capable model. Suggestion only; when no model is available the app asks the customer to choose manually.

The LLM is reached through a provider-neutral `LlmChatPort` with an OpenRouter implementation, so the model can be changed without touching callers. By default it uses **free** models that support both tool calling and images, in a fallback chain of three (OpenRouter's limit): OpenRouter tries the next if one is rate-limited or at capacity, and the client retries once on a transient failure. First choices are configurable (`AI_AGENT_MODEL`, `AI_VISION_MODEL`, `AI_FALLBACK_MODELS`). The API key is cleaned of stray quotes and whitespace on load, and the server logs only its length.

**Safety rules enforced in code, not left to the prompt:**
- **Identity comes from the session** (`@CurrentUser()`; architecture rule 9). The model never supplies a profile id; vehicle ids it supplies are checked for ownership by `VehicleService` before anything is proposed or run.
- **A model can only propose a write.** It is stored in `PendingActionsStore` and executes only via `POST /ai/agent/actions/:id/confirm`, which is bound to the user it was shown to, single-use and expires after 10 minutes. The user's tap, not a model-set flag, is the approval.
- **The emergency pre-filter runs before any model call** and files a real SOS alert (ADR 0021); it never depends on a model being up or correct.
- **Any model failure degrades gracefully**, never to an error screen: a message about a recognisable roadside problem (flat tyre, battery, fuel, tow) still gets the reviewed safety steps and the request button, chosen by the keyword classifier with no model; anything else gets the fixed FAQ answer.
- Rate limits (20/min per user for chat, 6/min for photos), a per-conversation message cap, a 6 MB body limit for the photo route, 300–700 token output caps.

## Alternatives Considered

- **Call the LLM directly from the mobile app.** Rejected: it would put the API key in the app and bypass identity, ownership and rate-limit checks.
- **Reuse DriveOps as a Python microservice.** Rejected for now: second runtime, second database, no auth model; the *design* was adopted, the code was not.
- **A model-supplied `confirmed` flag for writes (the DriveOps approach).** Rejected: a prompt-injected model could approve its own action.
- **Anthropic API (existing adapter) for the agent.** The existing `AnthropicAssistantAdapter` is kept for the FAQ assistant; OpenRouter was chosen for the agent at the product owner's direction (one key, many models, photo support).
- **Persist pending actions in the database.** Deferred: an in-memory store is sufficient for a single API instance and avoids a schema change before a demo.

## Consequences

- **Not production-ready until:** pending actions move to Redis or the database (the in-memory store breaks with more than one API instance); a provider-side agent exists (customers only today); and photo and agent accuracy are measured on real data — they have been exercised on a handful of hand-written cases only (ADR 0019's "no labelled data" caveat still applies).
- **Privacy:** photos and chat text are sent to a third-party model provider. A consent/disclosure step and a data-processing review are required before real users.
- **Cost:** the agent is bounded by call, history and rate limits, but there is no dollar cap per conversation for it (the legacy assistant has one).
- **Emergency pre-filter** is a substring keyword list (ADR 0019); a message containing e.g. "accident" files a real SOS alert even in a calm context.
- **Free-tier limits are the main operational risk.** A free OpenRouter account allows about 50 free-model requests per day (1000 with 10 credits added), plus a per-minute cap, and one agent message uses two to three requests (tool call, then answer). Free providers are also sometimes at capacity and replies take 3 to 15 seconds. When a limit is hit every feature degrades to its fallback, so the app stays usable, but the agent is then a FAQ bot. Quota should be monitored, and for real use a paid or credited account is needed.
- **Model choice matters:** the agent needs a tool-capable model and photo triage a vision-capable one; results vary between runs because the models are general-purpose.
- Ask MOTIQ answers only from tool results and the reviewed safety text; it does not diagnose faults and never gives repair instructions.
