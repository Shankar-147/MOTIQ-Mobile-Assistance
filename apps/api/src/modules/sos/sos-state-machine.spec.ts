import { SosAlertStatus } from "@motiq/types";
import {
  assertValidSosAlertTransition,
  InvalidSosAlertTransitionException,
  isTerminalSosAlertStatus,
} from "./sos-state-machine";

describe("assertValidSosAlertTransition", () => {
  it("allows TRIGGERED -> ACKNOWLEDGED", () => {
    expect(() =>
      assertValidSosAlertTransition(SosAlertStatus.TRIGGERED, SosAlertStatus.ACKNOWLEDGED),
    ).not.toThrow();
  });

  it("allows TRIGGERED -> RESOLVED directly (no forced acknowledgment step)", () => {
    expect(() =>
      assertValidSosAlertTransition(SosAlertStatus.TRIGGERED, SosAlertStatus.RESOLVED),
    ).not.toThrow();
  });

  it("allows ACKNOWLEDGED -> FALSE_ALARM", () => {
    expect(() =>
      assertValidSosAlertTransition(SosAlertStatus.ACKNOWLEDGED, SosAlertStatus.FALSE_ALARM),
    ).not.toThrow();
  });

  it("rejects reopening a RESOLVED alert", () => {
    expect(() =>
      assertValidSosAlertTransition(SosAlertStatus.RESOLVED, SosAlertStatus.ACKNOWLEDGED),
    ).toThrow(InvalidSosAlertTransitionException);
  });

  it("rejects reopening a FALSE_ALARM alert", () => {
    expect(() =>
      assertValidSosAlertTransition(SosAlertStatus.FALSE_ALARM, SosAlertStatus.TRIGGERED),
    ).toThrow(InvalidSosAlertTransitionException);
  });
});

describe("isTerminalSosAlertStatus", () => {
  it("treats RESOLVED and FALSE_ALARM as terminal", () => {
    expect(isTerminalSosAlertStatus(SosAlertStatus.RESOLVED)).toBe(true);
    expect(isTerminalSosAlertStatus(SosAlertStatus.FALSE_ALARM)).toBe(true);
  });

  it("treats TRIGGERED and ACKNOWLEDGED as non-terminal", () => {
    expect(isTerminalSosAlertStatus(SosAlertStatus.TRIGGERED)).toBe(false);
    expect(isTerminalSosAlertStatus(SosAlertStatus.ACKNOWLEDGED)).toBe(false);
  });
});
