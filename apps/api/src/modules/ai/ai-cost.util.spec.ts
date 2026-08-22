import { money } from "../../common/money";
import { estimateReplyCostUsd, hasExceededConversationCostCap } from "./ai-cost.util";

describe("estimateReplyCostUsd", () => {
  it("computes a cost from input/output token counts", () => {
    const cost = estimateReplyCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(cost.toString()).toBe("18");
  });

  it("returns zero for zero usage", () => {
    const cost = estimateReplyCostUsd({ inputTokens: 0, outputTokens: 0 });
    expect(cost.toString()).toBe("0");
  });

  it("rounds to 4 decimal places", () => {
    const cost = estimateReplyCostUsd({ inputTokens: 333, outputTokens: 0 });
    expect(cost.decimalPlaces()).toBeLessThanOrEqual(4);
  });
});

describe("hasExceededConversationCostCap", () => {
  it("returns false below the cap", () => {
    expect(hasExceededConversationCostCap(money("0.10"), money("1.00"))).toBe(false);
  });

  it("returns true at or above the cap", () => {
    expect(hasExceededConversationCostCap(money("1.00"), money("1.00"))).toBe(true);
    expect(hasExceededConversationCostCap(money("1.50"), money("1.00"))).toBe(true);
  });
});
