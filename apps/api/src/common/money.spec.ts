import { calculateCommissionSplit, money } from "./money";

describe("calculateCommissionSplit", () => {
  it("splits a round amount at the illustrative 15% rate (Ch6 §6.4.2)", () => {
    const result = calculateCommissionSplit(money("1000.00"), money("15"));
    expect(result.commissionAmount.toFixed(2)).toBe("150.00");
    expect(result.providerPayoutAmount.toFixed(2)).toBe("850.00");
  });

  it("always reconciles commission + payout back to the exact total", () => {
    const total = money("999.99");
    const result = calculateCommissionSplit(total, money("15"));
    expect(result.commissionAmount.add(result.providerPayoutAmount).toFixed(2)).toBe("999.99");
  });

  it("supports a zero commission rate (Ch7 §7.3.2 cold-start incentive)", () => {
    const result = calculateCommissionSplit(money("500.00"), money("0"));
    expect(result.commissionAmount.toFixed(2)).toBe("0.00");
    expect(result.providerPayoutAmount.toFixed(2)).toBe("500.00");
  });

  it("rejects a negative or zero total", () => {
    expect(() => calculateCommissionSplit(money("0"), money("15"))).toThrow();
    expect(() => calculateCommissionSplit(money("-1"), money("15"))).toThrow();
  });

  it("rejects an out-of-range rate", () => {
    expect(() => calculateCommissionSplit(money("100"), money("101"))).toThrow();
    expect(() => calculateCommissionSplit(money("100"), money("-1"))).toThrow();
  });
});
