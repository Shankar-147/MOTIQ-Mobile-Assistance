import { shouldAcceptLocationUpdate } from "./location-throttle.util";

describe("shouldAcceptLocationUpdate (Ch77 throttling)", () => {
  it("always accepts the first update (no prior timestamp)", () => {
    expect(shouldAcceptLocationUpdate(null, new Date(), 5000)).toBe(true);
  });

  it("rejects an update that arrives before minIntervalMs has elapsed", () => {
    const last = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:02.000Z"); // 2s later
    expect(shouldAcceptLocationUpdate(last, now, 5000)).toBe(false);
  });

  it("accepts an update once minIntervalMs has elapsed exactly", () => {
    const last = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:05.000Z"); // exactly 5s later
    expect(shouldAcceptLocationUpdate(last, now, 5000)).toBe(true);
  });

  it("accepts an update well after minIntervalMs has elapsed", () => {
    const last = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:01:00.000Z");
    expect(shouldAcceptLocationUpdate(last, now, 5000)).toBe(true);
  });
});
