import { ConflictException } from "@nestjs/common";
import { RequestStatus } from "@motiq/types";

/**
 * The canonical Service Request state machine (Ch19 — "the single most
 * load-bearing artifact in the handbook"; see ADR 0004 and docs/architecture.md §9).
 *
 * This is the ONLY place a ServiceRequest.status transition is allowed to be
 * decided. RequestService.transition() is the only code path permitted to
 * write ServiceRequest.status — never a raw `prisma.serviceRequest.update`
 * elsewhere (CLAUDE.md's architecture rules).
 *
 * Reasoning behind the graph, since Ch19 explicitly warns against adopting
 * the starting state list uncritically:
 * - MATCHING <-> ASSIGNED is a deliberate cycle, not a bug: a provider can
 *   reject or time out an offer, sending the request back to MATCHING for
 *   the next candidate (Ch53's reassignment behavior), rather than failing
 *   the whole request over one provider's non-response.
 * - Cancellation is allowed from every non-terminal state up through ARRIVED,
 *   because a driver or provider can legitimately change their mind at any
 *   point before service actually starts; SERVICE_IN_PROGRESS can only end in
 *   COMPLETED or FAILED, since a job that has already started isn't cleanly
 *   "cancelled" — that's a Ch135 (Failure-Path UX) / Ch57 (refund) concern.
 * - Every other terminal state (COMPLETED, CANCELLED_*, EXPIRED, FAILED) has
 *   no outgoing transitions — a completed or cancelled request never reopens.
 */
const ALLOWED_TRANSITIONS: Record<RequestStatus, ReadonlySet<RequestStatus>> = {
  [RequestStatus.REQUESTED]: new Set([
    RequestStatus.MATCHING,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.FAILED,
  ]),
  [RequestStatus.MATCHING]: new Set([
    RequestStatus.ASSIGNED,
    RequestStatus.EXPIRED,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.FAILED,
  ]),
  [RequestStatus.ASSIGNED]: new Set([
    RequestStatus.PROVIDER_ACCEPTED,
    RequestStatus.MATCHING, // provider rejected/timed out -> reassignment retry
    RequestStatus.CANCELLED_BY_CUSTOMER,
  ]),
  [RequestStatus.PROVIDER_ACCEPTED]: new Set([
    RequestStatus.PROVIDER_EN_ROUTE,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.CANCELLED_BY_PROVIDER,
  ]),
  [RequestStatus.PROVIDER_EN_ROUTE]: new Set([
    RequestStatus.ARRIVED,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.CANCELLED_BY_PROVIDER,
  ]),
  [RequestStatus.ARRIVED]: new Set([
    RequestStatus.SERVICE_IN_PROGRESS,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.CANCELLED_BY_PROVIDER,
  ]),
  [RequestStatus.SERVICE_IN_PROGRESS]: new Set([RequestStatus.COMPLETED, RequestStatus.FAILED]),
  [RequestStatus.COMPLETED]: new Set([]),
  [RequestStatus.CANCELLED_BY_CUSTOMER]: new Set([]),
  [RequestStatus.CANCELLED_BY_PROVIDER]: new Set([]),
  [RequestStatus.EXPIRED]: new Set([]),
  [RequestStatus.FAILED]: new Set([]),
};

export class InvalidStateTransitionException extends ConflictException {
  constructor(from: RequestStatus, to: RequestStatus) {
    super(`Cannot transition ServiceRequest from ${from} to ${to}`);
  }
}

export function isTerminalStatus(status: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[status].size === 0;
}

/** Throws InvalidStateTransitionException (-> HTTP 409) if the transition isn't allowed. */
export function assertValidTransition(from: RequestStatus, to: RequestStatus): void {
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new InvalidStateTransitionException(from, to);
  }
}
