import { estimateEta } from "./eta.util";

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
