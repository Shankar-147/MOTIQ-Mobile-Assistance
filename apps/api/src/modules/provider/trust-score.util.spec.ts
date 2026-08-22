import { ProviderVerificationStatus } from "@motiq/types";
import { money } from "../../common/money";
import { calculateTrustScore } from "./trust-score.util";

describe("calculateTrustScore (Ch58, ADR 0016)", () => {
  it("pulls a brand-new provider's score toward the neutral prior, not their raw rating", () => {
    // 1 job at 5.0 stars shouldn't score anywhere near 5.0 yet.
    const score = calculateTrustScore({
      ratingAverage: money("5.0"),
      completedJobCount: 1,
      verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    });
    expect(score.toNumber()).toBeLessThan(4);
    expect(score.toNumber()).toBeGreaterThan(3.5);
  });

  it("lets a high-volume provider's real rating dominate the prior", () => {
    const score = calculateTrustScore({
      ratingAverage: money("4.7"),
      completedJobCount: 500,
      verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    });
    expect(score.toNumber()).toBeGreaterThan(4.6);
  });

  it("ranks a high-volume 4.7-star provider above a 1-job 5.0-star provider", () => {
    const veteran = calculateTrustScore({
      ratingAverage: money("4.7"),
      completedJobCount: 500,
      verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    });
    const newcomer = calculateTrustScore({
      ratingAverage: money("5.0"),
      completedJobCount: 1,
      verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    });
    expect(veteran.greaterThan(newcomer)).toBe(true);
  });

  it("favors FULLY_VERIFIED over PROVISIONAL, all else equal (Ch1 Safety layer)", () => {
    const fullyVerified = calculateTrustScore({
      ratingAverage: money("4.5"),
      completedJobCount: 100,
      verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    });
    const provisional = calculateTrustScore({
      ratingAverage: money("4.5"),
      completedJobCount: 100,
      verificationStatus: ProviderVerificationStatus.PROVISIONAL,
    });
    expect(fullyVerified.greaterThan(provisional)).toBe(true);
  });

  it("scores non-matching-eligible statuses at exactly 0, regardless of rating", () => {
    for (const status of [
      ProviderVerificationStatus.UNVERIFIED,
      ProviderVerificationStatus.SUSPENDED,
      ProviderVerificationStatus.DELISTED,
    ]) {
      const score = calculateTrustScore({
        ratingAverage: money("5.0"),
        completedJobCount: 1000,
        verificationStatus: status,
      });
      expect(score.toNumber()).toBe(0);
    }
  });

  it("rejects an out-of-range rating", () => {
    expect(() =>
      calculateTrustScore({
        ratingAverage: money("5.1"),
        completedJobCount: 10,
        verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
      }),
    ).toThrow();
    expect(() =>
      calculateTrustScore({
        ratingAverage: money("-0.1"),
        completedJobCount: 10,
        verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
      }),
    ).toThrow();
  });

  it("rejects a negative completedJobCount", () => {
    expect(() =>
      calculateTrustScore({
        ratingAverage: money("4.0"),
        completedJobCount: -1,
        verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
      }),
    ).toThrow();
  });
});
