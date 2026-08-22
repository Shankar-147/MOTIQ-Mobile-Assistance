import { Prisma } from "@prisma/client";
import { ProviderVerificationStatus } from "@motiq/types";
import { money, Money } from "../../common/money";

/**
 * Ch58: rating aggregation and provider trust-score computation, feeding
 * Ch84's future ranking model. Not the same thing as ratingAverage — a
 * 5.0-star provider with 2 completed jobs and a 4.7-star provider with 500
 * completed jobs should NOT rank the same; a raw average conflates
 * confidence with quality. See ADR 0016.
 */
export interface TrustScoreInputs {
  ratingAverage: Money;
  completedJobCount: number;
  verificationStatus: ProviderVerificationStatus;
}

/** A neutral assumed rating for a provider with no completed jobs yet — not
 * 0 (which would unfairly punish brand-new providers) and not 5 (which
 * would let a single job outweigh evidence-backed veterans). */
const PRIOR_MEAN = money("3.5");
/** How many "phantom" jobs the prior is worth — higher means a new
 * provider's real ratings take longer to move their score away from
 * PRIOR_MEAN. Provisional, same status as other tuning constants. */
const PRIOR_WEIGHT = money("10");

/** Ch1 §1.6.2's Safety layer: a fully-verified provider should be favored
 * over a provisional one, all else equal; anything not currently matching-
 * eligible (Ch98) scores 0 outright — it shouldn't be ranked at all. */
const VERIFICATION_MULTIPLIER: Record<ProviderVerificationStatus, Money> = {
  [ProviderVerificationStatus.FULLY_VERIFIED]: money("1.0"),
  [ProviderVerificationStatus.PROVISIONAL]: money("0.9"),
  [ProviderVerificationStatus.UNVERIFIED]: money("0"),
  [ProviderVerificationStatus.SUSPENDED]: money("0"),
  [ProviderVerificationStatus.DELISTED]: money("0"),
};

/**
 * Returns a 0-5 score (same scale as star ratings, so it stays intuitive to
 * read directly). Bayesian-averages the raw rating toward PRIOR_MEAN,
 * weighted by job volume, then applies the verification-tier multiplier.
 */
export function calculateTrustScore(inputs: TrustScoreInputs): Money {
  if (inputs.ratingAverage.isNegative() || inputs.ratingAverage.greaterThan(5)) {
    throw new Error("ratingAverage must be between 0 and 5");
  }
  if (inputs.completedJobCount < 0) {
    throw new Error("completedJobCount must not be negative");
  }

  const jobCount = money(inputs.completedJobCount);
  const weightedRating = inputs.ratingAverage
    .mul(jobCount)
    .add(PRIOR_MEAN.mul(PRIOR_WEIGHT))
    .div(jobCount.add(PRIOR_WEIGHT));

  const multiplier = VERIFICATION_MULTIPLIER[inputs.verificationStatus];
  return weightedRating.mul(multiplier).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
