import { Prisma } from "@prisma/client";
import { money, Money } from "../../common/money";

/**
 * Ch90's binding "cost-per-conversation tracked and capped" (Ch6's
 * AI-cost-sensitivity finding). Anthropic's published per-token pricing for
 * the configured model would be the real input here; this bootstrap has no
 * live billing account to read real usage/pricing from, so it estimates
 * conservatively off token counts the SDK response reports. See ADR 0019.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** USD per 1M tokens — Claude Sonnet-class list pricing as of this bootstrap
 * phase; provisional, same status as every other tuning constant here, and
 * should be re-verified against Anthropic's current pricing page before
 * being trusted for a real budget. */
const INPUT_COST_PER_MILLION_TOKENS = money("3.00");
const OUTPUT_COST_PER_MILLION_TOKENS = money("15.00");

export function estimateReplyCostUsd(usage: TokenUsage): Money {
  const inputCost = money(usage.inputTokens).div(1_000_000).mul(INPUT_COST_PER_MILLION_TOKENS);
  const outputCost = money(usage.outputTokens).div(1_000_000).mul(OUTPUT_COST_PER_MILLION_TOKENS);
  return inputCost.add(outputCost).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function hasExceededConversationCostCap(currentCostUsd: Money, capUsd: Money): boolean {
  return currentCostUsd.greaterThanOrEqualTo(capUsd);
}
