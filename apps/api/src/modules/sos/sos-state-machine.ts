import { ConflictException } from "@nestjs/common";
import { SosAlertStatus } from "@motiq/types";

/**
 * Ch55's alert lifecycle. Deliberately simple compared to Ch19's request
 * state machine: `TRIGGERED` can resolve directly (a duplicate/test alert
 * doesn't need a formal "acknowledged" step first), but a resolved or
 * false-alarm alert is terminal — reopening a closed emergency alert would
 * hide the fact that the original response is what actually mattered.
 */
const ALLOWED_TRANSITIONS: Record<SosAlertStatus, SosAlertStatus[]> = {
  [SosAlertStatus.TRIGGERED]: [SosAlertStatus.ACKNOWLEDGED, SosAlertStatus.RESOLVED, SosAlertStatus.FALSE_ALARM],
  [SosAlertStatus.ACKNOWLEDGED]: [SosAlertStatus.RESOLVED, SosAlertStatus.FALSE_ALARM],
  [SosAlertStatus.RESOLVED]: [],
  [SosAlertStatus.FALSE_ALARM]: [],
};

export class InvalidSosAlertTransitionException extends ConflictException {
  constructor(from: SosAlertStatus, to: SosAlertStatus) {
    super(`Cannot transition SosAlert from ${from} to ${to}.`);
  }
}

export function assertValidSosAlertTransition(from: SosAlertStatus, to: SosAlertStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidSosAlertTransitionException(from, to);
  }
}

export function isTerminalSosAlertStatus(status: SosAlertStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
