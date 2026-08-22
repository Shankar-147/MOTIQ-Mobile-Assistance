# 0009 — Managed Message Queue for the Event Backbone

**Status:** Provisional
**Bible chapter to reconcile with:** Ch30 (Sync vs. Async Communication Design), Ch31 (Event-Driven Backbone Design)

## Context

Ch31 requires an event catalog (minimum: `RequestCreated`, `ProviderAssigned`, `ProviderTimedOut`, `PaymentSettled`, `JobCompleted`, `RatingSubmitted`), a dead-letter queue for every consumer, and states that "queue technology choice (SQS vs. RabbitMQ vs. Kafka) is an explicit ADR — default recommendation for V1 scale is a managed queue (SQS-class) over self-hosted Kafka, given team size." Ch30 assigns matching, notification fan-out, and analytics ingestion to the async path; auth, request-creation acknowledgment, and payment confirmation stay synchronous.

## Decision

For this bootstrap phase, the event backbone is defined as an interface (`DomainEventPublisher` / `DomainEventConsumer`) with an in-process, in-memory implementation (a simple NestJS `EventEmitter`-based adapter) — enough to let modules publish and subscribe to the Ch31 event catalog without coupling them directly to each other (preserving ADR 0001's module-boundary rule), but without standing up real infrastructure not yet justified at zero traffic. The production adapter is left as an explicit open choice between a managed SQS-class queue (Ch31's stated default) and self-hosted alternatives, to be made as a dedicated ADR once Chapter 101 (Cloud Architecture) picks a cloud provider — this bootstrap phase deliberately does not pick AWS/GCP/Azure (per the master prompt's Section 4.5, avoiding premature cloud lock-in).

## Alternatives Considered

- **Stand up a real SQS/RabbitMQ instance now.** Rejected as premature — no deployment target has been chosen yet (Ch101 not written), and Docker is not currently installed in this environment (see environment assessment), making local infra harder to justify before it's needed.
- **Direct service-to-service calls instead of an event backbone at all.** Rejected — violates Ch30/Ch31 directly and would recreate tight coupling between Matching, Notification, and Payment that ADR 0001's module boundaries exist to prevent.

## Consequences

- The event catalog's shape (event names, payloads) is decided now and won't need to change when the transport is swapped later — only the adapter implementation changes.
- No dead-letter-queue behavior exists yet in the in-memory adapter; this is explicitly listed in Reconciliation Notes as depending on Ch101/Ch31's real transport choice.
