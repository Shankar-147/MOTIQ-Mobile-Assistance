import { RankableCandidate, RankedCandidate } from "../provider-ranking.util";

/** Ch80/ADR 0007's `AiCapability.rankProviders()`. */
export interface ProviderRankingPort {
  rankProviders(candidates: RankableCandidate[]): Promise<RankedCandidate[]>;
}

export const PROVIDER_RANKING = Symbol("PROVIDER_RANKING");
