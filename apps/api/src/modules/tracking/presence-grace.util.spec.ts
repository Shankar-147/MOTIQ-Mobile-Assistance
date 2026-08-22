import { hasGracePeriodElapsed } from "./presence-grace.util";

describe("hasGracePeriodElapsed (Ch76 reconnection-storm mitigation)", () => {
  it("has not elapsed immediately after disconnect", () => {
    const disconnectedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:00.500Z");
    expect(hasGracePeriodElapsed(disconnectedAt, now, 30_000)).toBe(false);
  });

  it("has not elapsed just before the grace period ends", () => {
    const disconnectedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:29.999Z");
    expect(hasGracePeriodElapsed(disconnectedAt, now, 30_000)).toBe(false);
  });

  it("has elapsed exactly at the grace period boundary", () => {
    const disconnectedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:30.000Z");
    expect(hasGracePeriodElapsed(disconnectedAt, now, 30_000)).toBe(true);
  });

  it("has elapsed well after the grace period", () => {
    const disconnectedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:05:00.000Z");
    expect(hasGracePeriodElapsed(disconnectedAt, now, 30_000)).toBe(true);
  });
});
