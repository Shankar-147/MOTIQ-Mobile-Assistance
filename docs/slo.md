# MOTIQ SLIs/SLOs (Ch109)

Closes the V0 gap the original audit flagged: "99.4% uptime, no stated target." These are **proposed targets for the first real production quarter**, not numbers this bootstrap has measured — there is no deployed, load-tested instance to measure against yet (Ch101 hasn't chosen a cloud provider). Publishing them now, before real traffic, is deliberate: an SLO negotiated only after an incident is not a real target.

## Per-journey SLIs/SLOs, safety-relevant journeys first

| Journey | SLI | Proposed SLO | Why this journey, this target |
|---|---|---|---|
| Request creation (`POST /requests`) | Success rate; p95 latency | 99.9% success; p95 < 500ms | The one action a stranded driver must be able to complete — failure here has real-world safety cost, not just a bad UX metric |
| Matching dispatch (candidate → offer) | p95 time-to-first-offer | p95 < 5s (excludes the "no provider available" outcome, which isn't a failure) | Every second here is a second a driver waits with no confirmed help coming |
| Auth (`POST /auth/otp/verify`, `POST /auth/admin/login`) | Success rate; p95 latency | 99.9% success; p95 < 300ms | Nothing else works if this is down |
| Real-time tracking (WebSocket `location:update` fan-out) | p95 delivery latency, connected clients | p95 < 2s from provider ping to customer receipt | Ch1's "never false precision" promise only holds if the location shown is actually current |
| Payment settlement (`RequestCompleted` → `Payment.status`) | Success rate; p95 time-to-settle | 99.5% success; p95 < 10s | Money correctness matters more than money speed — this SLO is looser than request creation's on purpose |
| AI Assistant (`POST /ai/assistant/.../messages`) | Success rate (including graceful fallback) | 99.9% — note this counts `KeywordAssistantResponder`'s fallback reply as success, not just a real LLM reply, since ADR 0007 treats the fallback as the designed default, not degraded service | AI is explicitly non-critical-path (ADR 0007) — its SLO reflects that |

## Dashboards (Ch109's binding split)

**Technical dashboard** (latency, error rate, per-endpoint): for engineering on-call once one exists (Ch112). **Business dashboard** (active requests, provider utilization, match-success rate, cancellation rate): for ops/product. These must stay separate — a technical dashboard cluttered with business KPIs, or vice versa, serves neither audience well.

## What this document does not cover

Real alerting thresholds wired to a paging tool (Ch112), synthetic end-to-end health checks (Ch113), and verified backup/restore RPO/RTO numbers (Ch114) are all deferred pending real infrastructure (Ch101). Publishing an SLO with no monitoring stack to measure it against is itself flagged here, not hidden — see `docs/roadmap.md`'s Reconciliation Notes.
