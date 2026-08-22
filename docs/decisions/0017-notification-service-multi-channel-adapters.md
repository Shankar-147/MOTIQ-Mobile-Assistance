# 0017 — Notification Service: Multi-Channel Adapters, Preferences, Quiet Hours

**Status:** Provisional
**Bible chapters to reconcile with:** Ch59 (Notification Service Design), Ch70 (Push Notification Architecture), Ch79 (Cross-Channel Notification Orchestration)

## Context

`NotificationService` and the `Notification` entity existed since Phase 0, but only as a console-log adapter with no real channel behind it — `docs/roadmap.md`'s Reconciliation Notes flagged this explicitly rather than letting the docs imply it was wired. Ch59 calls for a "multi-channel (push/SMS/email) abstraction with preference and quiet-hours handling"; Ch79 requires delivery-guarantee tiers where CRITICAL (SOS/safety, and by extension OTP) is never dropped. Neither condensed chapter specifies exact channel providers, a preference-model shape, or a quiet-hours algorithm — those are this bootstrap phase's own invention, same as Ch98's document taxonomy was in ADR 0016.

## Decision

- **SMS**: real Twilio adapter (`TwilioSmsGatewayAdapter`) behind `SmsGatewayPort` (Ch32's adapter-boundary rule). No credentials are set in this environment — degrades to `isConfigured() === false` and a logged fallback, the same pattern as `RazorpayGatewayAdapter`.
- **Push**: real FCM adapter (`FcmPushGatewayAdapter`) behind `PushGatewayPort`, using FCM's **legacy** HTTP `fcm/send` + server-key API rather than the current HTTP v1 API. HTTP v1 needs a service-account OAuth2 token exchange, which would require an extra dependency (`google-auth-library` or `firebase-admin`) for a channel with no real FCM project configured in this session — deliberately deferred. **This is provisional and should not ship to production as-is**: Google has deprecated the legacy API. Migrate to HTTP v1 when Ch70 is written at full depth or before a real launch, whichever comes first.
- **Email**: no adapter at all yet — logs only, same as an unconfigured SMS/push gateway. Not enough of the Bible names an email requirement to justify picking a provider (SES/SendGrid/etc.) speculatively.
- **Preferences**: a new `NotificationPreference` row per user (`smsEnabled`/`pushEnabled`/`emailEnabled` + `quietHoursStartHour`/`quietHoursEndHour`, both nullable local-hour-of-day integers, wrapping past midnight). Created lazily on first read/write with all channels enabled and no quiet hours, rather than backfilled — there's no migration-time trigger for "every existing user needs a preference row" this early.
- **CRITICAL never suppressed** (Ch79): `isSuppressedByPreference()` — a pure, fully-tested function — returns `false` unconditionally for `NotificationDeliveryTier.CRITICAL`, before even checking the channel toggle. `BEST_EFFORT` respects both the channel toggle and quiet hours.
- **OTP bypasses the whole preference/persistence path**: `NotificationService.sendOtpSms()` is a separate method from `send()`. OTP delivery happens before a `User` row necessarily exists (new-registration phones have none yet), so it has no `userId` to preference-check or persist a `Notification` row against, and — being an auth/security path, not a marketing/status path — it should never be quiet-hours-suppressible regardless. It calls `SmsGatewayPort` directly.
- **Domain-event fan-out** (`NotificationEventListener`, ADR 0013's event-backbone pattern): `RequestCreated`, `ProviderAssigned`, `PaymentSettled`, `RatingSubmitted` each trigger one `BEST_EFFORT` `PUSH` notification. All four are wrapped in a try/catch that only logs — a notification failure must never fail the transaction flow it's reacting to, mirroring ADR 0007's "additive, never load-bearing" principle extended from AI to notifications generally.
- **Push device registration** (Ch70): a new `PushDeviceToken` model, upserted by token value (`POST /api/v1/notifications/device-tokens`) so a re-registered token never duplicates a row. A user can have more than one (phone + tablet); `dispatchPush()` fans out to all of a user's registered tokens and treats any single success as overall success.

## Alternatives Considered

- **Backfill `NotificationPreference` for every existing user via a migration.** Rejected — no live database exists in this session to migrate against (same constraint noted throughout every prior phase), and lazy creation is simpler and behaviorally identical for a bootstrap phase with no real user base yet.
- **Route OTP through the same `send()`/`Notification`-row path as everything else.** Rejected — would require making `Notification.userId` nullable (weakening the FK for every other call site) just to accommodate the one path that legitimately has no user yet. A dedicated method is more honest about OTP being a different kind of send.
- **Use FCM's HTTP v1 API from the start.** Rejected for this phase — the OAuth2 service-account exchange needs a dependency this environment has no credentials to exercise anyway; the legacy API validates the same architectural seam (`PushGatewayPort`) without the extra weight. Flagged explicitly above as needing revisit, not silently left as if it were the final choice.

## Consequences

- Nothing in this session has been exercised against a real Twilio or FCM project — no credentials were available, same caveat as Razorpay in ADR 0014. Tracked in `docs/roadmap.md`'s Reconciliation Notes.
- `Notification.status` gained a fourth value, `SUPPRESSED`, distinct from `FAILED` (a real send that errored) — an operator reading notification history can tell "we chose not to send this" apart from "we tried and it broke."
- The preference/quiet-hours model (exact field shape, hour-granularity rather than minute-granularity) is this bootstrap phase's invention, not a Bible-specified contract — revisit when Ch59 is written at full depth.
- Email channel remains unimplemented; tracked in Reconciliation Notes for whenever a chapter names a required provider.
