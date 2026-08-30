import { estimateEta, estimateEtaFromRouteDuration } from "./eta.util";

describe("estimateEta (Ch54, ADR 0007's binding ETA fallback)", () => {
  it("computes minutes from distance at the default average speed (30 km/h)", () => {
    const result = estimateEta(15_000); // 15km at 30km/h = 30 minutes
    expect(result.estimatedMinutes).toBe(30);
  });

  it("always returns a range, not just a point estimate (Ch1 — never false precision)", () => {
    const result = estimateEta(15_000);
    expect(result.minMinutes).toBeLessThan(result.estimatedMinutes);
    expect(result.maxMinutes).toBeGreaterThan(result.estimatedMinutes);
  });

  it("supports a custom average speed", () => {
    const result = estimateEta(10_000, 20); // 10km at 20km/h = 30 minutes
    expect(result.estimatedMinutes).toBe(30);
  });

  it("never returns a negative minute value even for a tiny distance", () => {
    const result = estimateEta(1);
    expect(result.minMinutes).toBeGreaterThanOrEqual(0);
  });

  it("rejects a negative distance", () => {
    expect(() => estimateEta(-1)).toThrow();
  });

  it("rejects a non-positive average speed", () => {
    expect(() => estimateEta(1000, 0)).toThrow();
    expect(() => estimateEta(1000, -5)).toThrow();
  });
});

describe("estimateEtaFromRouteDuration (Ch32's real-routing ETA path)", () => {
  it("converts a real route duration (seconds) into minutes", () => {
    const result = estimateEtaFromRouteDuration(15_000, 1800); // 1800s = 30 minutes
    expect(result.estimatedMinutes).toBe(30);
    expect(result.distanceMeters).toBe(15_000);
  });

  it("uses a narrower uncertainty band than the straight-line fallback (real data is more precise)", () => {
    const routed = estimateEtaFromRouteDuration(15_000, 1800);
    const straightLine = estimateEta(15_000);
    const routedSpread = routed.maxMinutes - routed.minMinutes;
    const straightLineSpread = straightLine.maxMinutes - straightLine.minMinutes;
    expect(routedSpread).toBeLessThan(straightLineSpread);
  });

  it("still returns a range, not a bare point estimate", () => {
    const result = estimateEtaFromRouteDuration(15_000, 1800);
    expect(result.minMinutes).toBeLessThan(result.estimatedMinutes);
    expect(result.maxMinutes).toBeGreaterThan(result.estimatedMinutes);
  });

  it("rejects a negative distance or duration", () => {
    expect(() => estimateEtaFromRouteDuration(-1, 100)).toThrow();
    expect(() => estimateEtaFromRouteDuration(100, -1)).toThrow();
  });
});
