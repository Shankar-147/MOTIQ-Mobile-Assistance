import { RequestStatus } from "@motiq/types";
import {
  InvalidStateTransitionException,
  assertValidTransition,
  isTerminalStatus,
} from "./request-state-machine";

describe("ServiceRequest state machine (Ch19, ADR 0004)", () => {
  it("allows the full happy path", () => {
    const happyPath: RequestStatus[] = [
      RequestStatus.REQUESTED,
      RequestStatus.MATCHING,
      RequestStatus.ASSIGNED,
      RequestStatus.PROVIDER_ACCEPTED,
      RequestStatus.PROVIDER_EN_ROUTE,
      RequestStatus.ARRIVED,
      RequestStatus.SERVICE_IN_PROGRESS,
      RequestStatus.COMPLETED,
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(() => assertValidTransition(happyPath[i], happyPath[i + 1])).not.toThrow();
    }
  });

  it("allows ASSIGNED -> MATCHING as a reassignment retry when a provider rejects/times out", () => {
    expect(() => assertValidTransition(RequestStatus.ASSIGNED, RequestStatus.MATCHING)).not.toThrow();
  });

  it("allows MATCHING -> EXPIRED when no provider accepts in time", () => {
    expect(() => assertValidTransition(RequestStatus.MATCHING, RequestStatus.EXPIRED)).not.toThrow();
  });

  it("rejects COMPLETED -> MATCHING (a completed request never reopens)", () => {
    expect(() => assertValidTransition(RequestStatus.COMPLETED, RequestStatus.MATCHING)).toThrow(
      InvalidStateTransitionException,
    );
  });

  it("rejects cancellation once a job is already in progress", () => {
    expect(() =>
      assertValidTransition(RequestStatus.SERVICE_IN_PROGRESS, RequestStatus.CANCELLED_BY_CUSTOMER),
    ).toThrow(InvalidStateTransitionException);
  });

  it("treats every truly-terminal state as having no outgoing transitions", () => {
    const terminalStates: RequestStatus[] = [
      RequestStatus.COMPLETED,
      RequestStatus.CANCELLED_BY_CUSTOMER,
      RequestStatus.CANCELLED_BY_PROVIDER,
      RequestStatus.FAILED,
    ];
    for (const status of terminalStates) {
      expect(isTerminalStatus(status)).toBe(true);
    }
  });

  it("allows an admin manual dispatch override to reopen an EXPIRED request (Ch61)", () => {
    expect(isTerminalStatus(RequestStatus.EXPIRED)).toBe(false);
    expect(() => assertValidTransition(RequestStatus.EXPIRED, RequestStatus.PROVIDER_ACCEPTED)).not.toThrow();
    // Still rejects every other attempted transition out of EXPIRED — the
    // override is the one deliberate exception, not a general reopening.
    expect(() => assertValidTransition(RequestStatus.EXPIRED, RequestStatus.MATCHING)).toThrow(
      InvalidStateTransitionException,
    );
  });

  it("allows an admin manual dispatch override to skip straight from MATCHING to PROVIDER_ACCEPTED", () => {
    expect(() => assertValidTransition(RequestStatus.MATCHING, RequestStatus.PROVIDER_ACCEPTED)).not.toThrow();
  });
});
