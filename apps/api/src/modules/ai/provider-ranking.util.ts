export interface RankableCandidate {
  id: string;
  distanceMeters: number;
  /** 0-5 scale, same as calculateTrustScore's output (trust-score.util.ts). */
  trustScore: number;
}

export interface RankedCandidate extends RankableCandidate {
  score: number;
  /** Ch84's binding "explainability required for provider-dispute
   * resolution" — every score is traceable to its two inputs, not a black box. */
  scoreBreakdown: { distanceComponent: number; trustComponent: number };
}

export interface RankingWeights {
  distanceWeight: number;
  trustWeight: number;
}

const DEFAULT_WEIGHTS: RankingWeights = { distanceWeight: 0.7, trustWeight: 0.3 };

/** Distance beyond this contributes nothing further to the score — matches
 * MATCHING_SEARCH_RADIUS_METERS' default (candidates are pre-filtered to
 * within this radius anyway, so it's a normalization bound, not a new cutoff). */
const DISTANCE_NORMALIZATION_METERS = 10_000;

/**
 * Ch84's stand-in for a learning-to-rank model: a deterministic weighted
 * score, not a trained model — this bootstrap has no historical
 * accept/reject/dispute data to train one against (see ADR 0019). Closer and
 * more-trusted candidates score higher. `weights` defaults to a 70/30
 * distance/trust split — provisional, same tuning-constant status as
 * MATCHING_SEARCH_RADIUS_METERS elsewhere in this codebase.
 */
export function rankProviderCandidates(
  candidates: RankableCandidate[],
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const normalizedDistance = Math.min(candidate.distanceMeters / DISTANCE_NORMALIZATION_METERS, 1);
      const distanceComponent = weights.distanceWeight * (1 - normalizedDistance);
      const trustComponent = weights.trustWeight * (candidate.trustScore / 5);
      return {
        ...candidate,
        score: distanceComponent + trustComponent,
        scoreBreakdown: { distanceComponent, trustComponent },
      };
    })
    .sort((a, b) => b.score - a.score);
}
