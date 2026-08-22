import { Injectable } from "@nestjs/common";
import { ProviderRankingPort } from "../ports/provider-ranking.port";
import { RankableCandidate, RankedCandidate, rankProviderCandidates } from "../provider-ranking.util";

/**
 * The only ProviderRankingPort implementation in this bootstrap phase — see
 * provider-ranking.util.ts's doc comment for why this is a deterministic
 * weighted score, not a trained learning-to-rank model.
 */
@Injectable()
export class WeightedScoreRankingAdapter implements ProviderRankingPort {
  async rankProviders(candidates: RankableCandidate[]): Promise<RankedCandidate[]> {
    return rankProviderCandidates(candidates);
  }
}
