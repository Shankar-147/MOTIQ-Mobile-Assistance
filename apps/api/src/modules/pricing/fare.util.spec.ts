import { money } from "../../common/money";
import { SurgeCapExceededError, calculateFare } from "./fare.util";

const noSurgeNoPromo = (overrides: Partial<Parameters<typeof calculateFare>[0]> = {}) =>
  calculateFare({
    distanceKm: money("5"),
    baseFare: money("50.00"),
    perKmRate: money("10.00"),
    surgeMultiplier: money("1.00"),
    maxSurgeMultiplier: money("2.00"),
    promotionDiscount: money("0.00"),
    ...overrides,
  });

describe("calculateFare (Ch56, Ch8)", () => {
  it("computes base + distance with no surge and no promotion", () => {
    const result = noSurgeNoPromo();
    expect(result.baseFare.toFixed(2)).toBe("50.00");
    expect(result.distanceComponent.toFixed(2)).toBe("50.00"); // 5km * 10/km
    expect(result.subtotal.toFixed(2)).toBe("100.00");
    expect(result.totalAmount.toFixed(2)).toBe("100.00");
  });

  it("applies the surge multiplier to (base + distance), not to base alone", () => {
    const result = noSurgeNoPromo({ surgeMultiplier: money("1.50") });
    // (50 + 50) * 1.5 = 150
    expect(result.subtotal.toFixed(2)).toBe("150.00");
    expect(result.totalAmount.toFixed(2)).toBe("150.00");
  });

  it("subtracts the promotion as a separate ledger line, after surge (Ch8)", () => {
    const result = noSurgeNoPromo({
      surgeMultiplier: money("1.50"),
      promotionDiscount: money("20.00"),
    });
    expect(result.subtotal.toFixed(2)).toBe("150.00");
    expect(result.promotionDiscount.toFixed(2)).toBe("20.00");
    expect(result.totalAmount.toFixed(2)).toBe("130.00");
  });

  it("floors totalAmount at zero if a promotion exceeds the subtotal", () => {
    const result = noSurgeNoPromo({ promotionDiscount: money("500.00") });
    expect(result.totalAmount.toFixed(2)).toBe("0.00");
  });

  it("rejects a surge multiplier above the configured cap (Ch8, binding)", () => {
    expect(() =>
      noSurgeNoPromo({ surgeMultiplier: money("3.00"), maxSurgeMultiplier: money("2.00") }),
    ).toThrow(SurgeCapExceededError);
  });

  it("rejects a surge multiplier below 1.00", () => {
    expect(() => noSurgeNoPromo({ surgeMultiplier: money("0.50") })).toThrow();
  });

  it("rejects a negative distance", () => {
    expect(() => noSurgeNoPromo({ distanceKm: money("-1") })).toThrow();
  });

  it("rejects a negative promotion", () => {
    expect(() => noSurgeNoPromo({ promotionDiscount: money("-1") })).toThrow();
  });
});
