# Architecture Decision Records (ADR) Index

This mirrors the process the Bible will formally define in **Chapter 36**; kept compatible now so these records fold into that chapter with minimal rework when it's written.

## Template

```markdown
# NNNN — Title

**Status:** Provisional | Confirmed
**Bible chapter to reconcile with:** Ch. NN — Chapter Name
**Mission commitment served (Ch1 §1.4.2):** verification | matching | pricing | data-compounding

## Context
## Decision
## Alternatives Considered
## Consequences
```

`Confirmed` means the Bible's condensed chapters already state this as a binding decision (see `docs/handbook/README.md`'s binding-constraint rule) and this ADR is just recording how the bootstrap implements it. `Provisional` means this is a genuinely open decision this bootstrap phase made in the Bible's silence, to be revisited when the corresponding full chapter is written.

## Index

| # | Title | Status | Bible chapter |
|---|---|---|---|
| 0001 | [Modular monolith, NestJS](0001-modular-monolith-nestjs-architecture.md) | Confirmed | Ch25, Ch26, Ch48 |
| 0002 | [PostgreSQL + PostGIS + Prisma](0002-postgresql-prisma-postgis.md) | Confirmed (Prisma choice: Provisional) | Ch37–39 |
| 0003 | [Configurable commission, auditable payment split](0003-configurable-commission-and-auditable-payment-split.md) | Confirmed | Ch6, Ch34, Ch57 |
| 0004 | [Service request state machine](0004-service-request-state-machine.md) | Confirmed (timeout values: Provisional) | Ch19, Ch52, Ch53 |
| 0005 | [Two-tier provider verification status](0005-two-tier-provider-verification-status.md) | Confirmed | Ch7 §7.3.2, Ch98 |
| 0006 | [Service area / city scoping](0006-service-area-scoping-for-cold-start.md) | Provisional | Ch7 |
| 0007 | [AI as additive capability, never load-bearing](0007-ai-as-additive-capability-not-load-bearing.md) | Confirmed | Ch1 §1.6.2, Ch90, Ch91 |
| 0008 | [Web admin console vs. mobile customer/provider apps](0008-web-admin-console-vs-mobile-customer-provider-apps.md) | Provisional | Ch64, Ch137 |
| 0009 | [Managed message queue for the event backbone](0009-managed-message-queue-for-event-backbone.md) | Provisional | Ch31 |
| 0010 | [Monorepo repository structure](0010-monorepo-repository-structure.md) | Provisional | Ch24, Ch48 |
| 0011 | [OTP + JWT + opaque refresh tokens, guard-based RBAC](0011-otp-jwt-refresh-token-rbac-implementation.md) | Confirmed (requirements); Provisional (implementation specifics) | Ch33, Ch50, Ch51 |
| 0012 | [FareConfig and the Pricing Engine's distance input](0012-fare-config-and-pricing-engine.md) | Confirmed (fare formula); Provisional (match-time distance as input) | Ch8, Ch56 |
| 0013 | [Matching dispatch, reassignment, and the event backbone (realized)](0013-matching-dispatch-and-event-backbone.md) | Confirmed (dispatch/reassignment); Provisional (single-offer-only, no scheduler) | Ch31, Ch52, Ch53 |
| 0014 | [Payment settlement flow and the Razorpay adapter](0014-payment-settlement-and-razorpay-adapter.md) | Confirmed (auto-settlement, mandatory webhook verification); Provisional (Razorpay specifically) | Ch32, Ch57 |
| 0015 | [Real-time tracking: WebSocket gateway, presence, location_pings](0015-realtime-tracking-websocket-gateway.md) | Confirmed (gateway + Redis scaling, hypertable); Provisional (timing defaults, no downsampling) | Ch40, Ch54, Ch75–77 |
| 0016 | [Provider verification state machine, KYC review workflow, and trust score](0016-provider-verification-and-trust-score.md) | Confirmed (guarded state machine, re-verification/de-listing, trust score); Provisional (transition graph specifics, cadence, formula, document taxonomy) | Ch58, Ch61, Ch98 |
| 0017 | [Notification Service: multi-channel adapters, preferences, quiet hours](0017-notification-service-multi-channel-adapters.md) | Confirmed (multi-channel abstraction, CRITICAL-never-suppressed); Provisional (Twilio/FCM specifically, preference model shape) | Ch59, Ch70, Ch79 |
| 0018 | [Mobile framework: React Native (Expo), resolving ADR 0008](0018-react-native-expo-mobile-framework.md) | Provisional | Ch64–74 |
| 0019 | [AI Capability architecture and scope](0019-ai-capability-architecture-and-scope.md) | Confirmed (interface/fallback discipline); Provisional (heuristic adapters, deferred chapters) | Ch80–91 |
| 0020 | [Security hardening, observability, compliance scope](0020-security-hardening-observability-compliance-scope.md) | Confirmed (DPDP real-endpoints requirement, consent gating); Provisional (encryption master-key management, GPS-spoof thresholds, erasure-as-anonymization) | Ch92–100, Ch101–117, Ch126–132 |
| 0021 | [SOS & Safety Service](0021-sos-safety-service.md) | Confirmed (bypass-priority, no-delay rate-limiting exemption); Provisional (alert lifecycle, emergency-number config, no real emergency-service integration) | Ch55, Ch1 §1.8, Ch90 |
| 0022 | [Admin Console session architecture: Next.js as a BFF](0022-admin-console-bff-session-pattern.md) | Provisional | Ch137 |
