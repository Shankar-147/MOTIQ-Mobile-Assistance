# 0014 — Payment Settlement Flow and the Razorpay Adapter

**Status:** Confirmed (auto-settlement on completion, webhook signature verification mandatory); **Provisional** (Razorpay specifically, "not configured" degrade behavior)
**Bible chapter to reconcile with:** Ch32 (Third-Party Integration Architecture), Ch57 (Payment Processing Service Design)
**Mission commitment served (Ch1 §1.4.2):** pricing/payment infrastructure — provider payout and platform commission must be reliable and auditable

## Context

Ch57 requires webhook signature verification (mandatory) and idempotent payment-intent creation (Ch43 keys). Ch32 requires every third-party call to go through an internal adapter, never a direct SDK call from domain code. No Razorpay account/API keys exist in this environment.

## Decision

`PaymentService.settleServiceRequest()` runs automatically via the `RequestCompleted` event (ADR 0013) — no manual "settle" endpoint exists; completing a job is what triggers payment. It computes the fare (`PricingService`, ADR 0012), creates the `Payment` row through the existing idempotent `createPayment()` (key: `settle:${serviceRequestId}` — a request can only ever be settled once), then — only if `PaymentGatewayPort.isConfigured()` — creates a Razorpay order and stores its ID as `gatewayReference`, moving `Payment.status` to `AUTHORIZED`.

`RazorpayGatewayAdapter` implements `PaymentGatewayPort` (Ch32's adapter interface) and is bound via a `PAYMENT_GATEWAY` injection token (`payment.module.ts`) — `PaymentService` never imports the adapter class directly. With no `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` configured, `isConfigured()` returns `false` and the adapter is never called — `Payment` settles as `PENDING` with no `gatewayReference`, logged loudly, the same "honest about what's not wired" pattern as `NotificationService` and `AuthService`'s OTP delivery (ADR 0011). **This has not been exercised against a real Razorpay sandbox in this session** — no credentials were available; the adapter code is real, but only unit-testable up to the signature-verification boundary (`razorpay-signature.util.spec.ts`), not integration-tested against Razorpay's actual API.

Webhook handling (`POST /payments/webhooks/razorpay`) is unauthenticated by route (a webhook can't present a bearer token) — the HMAC-SHA256 signature check against `RAZORPAY_WEBHOOK_SECRET` **is** the authentication, and it's mandatory: no secret configured means the handler throws rather than silently trusting an unsigned payload. Verification runs against `req.rawBody` (enabled via `NestFactory.create(AppModule, { rawBody: true })` in `main.ts`), never the parsed JSON body, since Razorpay signs the exact bytes it sent.

## Alternatives Considered

- **Throwing if the gateway isn't configured, instead of degrading to `PENDING`.** Rejected — would make the entire "core transaction flow" (the point of Phase 2) impossible to exercise end-to-end without live Razorpay credentials, which this bootstrap environment doesn't have. A `PENDING` payment with a loud warning is more honest than either crashing the request-completion flow or faking a successful charge.
- **A manual `POST /requests/:id/settle` endpoint instead of (or alongside) the automatic event trigger.** Rejected as redundant — job completion is the only legitimate trigger for settlement; a separate manual path would just be a second way to reach the same idempotent operation, adding surface area without adding capability.

## Consequences

- No refund flow, no partial-capture handling, no dispute/chargeback handling — all real Ch57/Ch97 work, not attempted here.
- If a `createOrder()` call throws (network error, bad credentials once configured), the `Payment` row stays `PENDING` with no automatic retry — Ch62's future background-job infrastructure owns reconciliation; not built here.
- The webhook handler updates `Payment.status` on `payment.captured`/`payment.failed` events only; other Razorpay webhook event types are received (and correctly rejected/ignored if unsigned) but have no handling logic yet.
