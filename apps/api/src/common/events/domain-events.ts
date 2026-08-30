/**
 * Ch31's minimum event catalog. This is the in-process adapter behind
 * DomainEventPublisher/Consumer (ADR 0009) — implemented for real in Phase 2
 * using @nestjs/event-emitter, so Request/Matching/Payment can react to each
 * other without importing one another's modules (ADR 0001's boundary rule).
 * The production transport (managed queue vs. self-hosted) is still an open
 * choice — see ADR 0009 — this only decides the in-process event names and
 * payload shapes, which don't need to change when the transport does.
 */
export const DomainEvents = {
  RequestCreated: "request.created",
  RequestCompleted: "request.completed",
  ProviderAssigned: "provider.assigned",
  ProviderTimedOut: "provider.timed-out",
  MatchingFailed: "matching.failed",
  PaymentSettled: "payment.settled",
  RatingSubmitted: "rating.submitted",
} as const;

export interface RequestCreatedEvent {
  serviceRequestId: string;
}

export interface RequestCompletedEvent {
  serviceRequestId: string;
}

export interface ProviderAssignedEvent {
  serviceRequestId: string;
  assignmentId: string;
  providerProfileId: string;
}

export interface ProviderTimedOutEvent {
  serviceRequestId: string;
  assignmentId: string;
  providerProfileId: string;
}

/** Emitted when dispatch() finds zero available candidates and the request
 * expires (Ch7 §7.5.3's "no provider available" outcome) — TrackingGateway
 * forwards this to the customer's Socket.IO room so the mobile Matching
 * screen can show "no provider found" instead of waiting forever. */
export interface MatchingFailedEvent {
  serviceRequestId: string;
}

export interface PaymentSettledEvent {
  serviceRequestId: string;
  paymentId: string;
}

export interface RatingSubmittedEvent {
  serviceRequestId: string;
  providerProfileId: string;
}
