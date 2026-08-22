# MOTIQ Incident Response (Ch100)

This is the baseline this bootstrap phase can responsibly define — a severity taxonomy and a first-response procedure grounded in what's actually built. It is not a full on-call/paging program (Ch112, deferred — no infra to page against yet).

## Severity classification

| Severity | Definition | MOTIQ examples |
|---|---|---|
| **SEV-1** | Safety-critical path down, or a confirmed data breach | Request creation or matching entirely down; auth entirely down; confirmed unauthorized access to KYC documents or payment data |
| **SEV-2** | Core transaction flow degraded but not down; suspected (unconfirmed) breach | Payment settlement failing for a subset of requests; WebSocket tracking down (customers can't see providers, but matching still works); a suspicious pattern in `AuditLog`/GPS-spoof flags warranting investigation |
| **SEV-3** | Non-critical feature degraded | Push/SMS notification delivery failing (already degrades to a logged fallback by design — Ch32); AI Assistant unavailable (falls back to `KeywordAssistantResponder`, Ch90) |
| **SEV-4** | Cosmetic or low-impact | Admin Console UI bug with a working workaround |

Every severity tier here maps to a **safety-relevant journey first**: request creation, matching, and auth are always SEV-1 candidates regardless of how many users are affected, because a stranded driver's exposure isn't proportional to MOTIQ's user count the way a typical SaaS outage is.

## First-response procedure

1. **Classify.** Use the table above. When uncertain between two tiers, classify at the higher one — de-escalating after investigation is cheap; discovering a SEV-1 was mis-triaged as SEV-3 is not.
2. **Contain, don't just observe.** For a suspected breach: rotate the specific credential/key implicated (`JWT_ACCESS_SECRET`, `ENCRYPTION_MASTER_KEY`, `RAZORPAY_WEBHOOK_SECRET`, etc. — see `.env.example`) before root-causing. Rotating `JWT_ACCESS_SECRET` invalidates every live access token (15-minute natural expiry means this is a bounded blast radius already); refresh tokens are separately revocable per-row (`RefreshToken.revokedAt`).
3. **Correlate.** Every request carries an `X-Correlation-Id` (Ch111, response header) — use it to trace one incident's requests across logs once a log aggregator exists (Ch110, deferred pending Ch101's cloud choice).
4. **Check `AuditLog`.** Verification-status changes, document reviews, and (as of Phase 7) any account-erasure actions are recorded there — the first place to look for "what changed and who did it."
5. **Communicate honestly about scope.** State what's confirmed, what's suspected, and what's still unknown — don't round a "suspected" up to "confirmed" or down to "no impact" under pressure.
6. **Post-incident review.** For SEV-1/SEV-2: write down what happened, why the existing safeguards didn't catch it (or did, and what happened next), and whether a new guardrail (a test, a rate limit, an alert) would have prevented it — feed real findings into `docs/roadmap.md`'s Reconciliation Notes if they reveal a gap, not just into a private postmortem doc.

## What this document does not cover

Named per-scenario runbooks (DB failover, matching-service-down, payment-gateway-outage, full-region-outage — Ch115), a real on-call rotation and paging tool (Ch112), and chaos-engineering-validated recovery times (Ch116) are all deferred — there is no deployed infrastructure yet for any of them to run against. See `docs/roadmap.md`'s Reconciliation Notes.
