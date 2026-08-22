import { ProviderVerificationStatus } from "@motiq/types";
import {
  InvalidVerificationTransitionException,
  assertValidVerificationTransition,
  isEligibleForMatching,
  isTerminalVerificationStatus,
} from "./provider-verification-state-machine";

describe("Provider verification state machine (Ch98, ADR 0016)", () => {
  it("allows the cold-start fast-track path (UNVERIFIED -> PROVISIONAL -> FULLY_VERIFIED)", () => {
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.UNVERIFIED,
        ProviderVerificationStatus.PROVISIONAL,
      ),
    ).not.toThrow();
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.PROVISIONAL,
        ProviderVerificationStatus.FULLY_VERIFIED,
      ),
    ).not.toThrow();
  });

  it("allows skipping straight to FULLY_VERIFIED from UNVERIFIED", () => {
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.UNVERIFIED,
        ProviderVerificationStatus.FULLY_VERIFIED,
      ),
    ).not.toThrow();
  });

  it("allows reinstatement from SUSPENDED to either tier", () => {
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.SUSPENDED,
        ProviderVerificationStatus.PROVISIONAL,
      ),
    ).not.toThrow();
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.SUSPENDED,
        ProviderVerificationStatus.FULLY_VERIFIED,
      ),
    ).not.toThrow();
  });

  it("rejects any transition out of DELISTED — it's terminal", () => {
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.DELISTED,
        ProviderVerificationStatus.PROVISIONAL,
      ),
    ).toThrow(InvalidVerificationTransitionException);
    expect(isTerminalVerificationStatus(ProviderVerificationStatus.DELISTED)).toBe(true);
  });

  it("rejects going straight from FULLY_VERIFIED back to PROVISIONAL (must go through SUSPENDED)", () => {
    expect(() =>
      assertValidVerificationTransition(
        ProviderVerificationStatus.FULLY_VERIFIED,
        ProviderVerificationStatus.PROVISIONAL,
      ),
    ).toThrow(InvalidVerificationTransitionException);
  });

  it("treats only PROVISIONAL and FULLY_VERIFIED as matching-eligible", () => {
    expect(isEligibleForMatching(ProviderVerificationStatus.PROVISIONAL)).toBe(true);
    expect(isEligibleForMatching(ProviderVerificationStatus.FULLY_VERIFIED)).toBe(true);
    expect(isEligibleForMatching(ProviderVerificationStatus.UNVERIFIED)).toBe(false);
    expect(isEligibleForMatching(ProviderVerificationStatus.SUSPENDED)).toBe(false);
    expect(isEligibleForMatching(ProviderVerificationStatus.DELISTED)).toBe(false);
  });
});
