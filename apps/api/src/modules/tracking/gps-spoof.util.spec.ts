import { detectImplausibleMovement } from "./gps-spoof.util";

const BASE_TIME = new Date("2026-01-01T00:00:00Z");

describe("detectImplausibleMovement", () => {
  it("never flags the first ping (no previous point to compare)", () => {
    expect(
      detectImplausibleMovement(null, { latitude: 12.9, longitude: 77.6, recordedAt: BASE_TIME }),
    ).toBe(false);
  });

  it("does not flag normal driving movement", () => {
    const previous = { latitude: 12.9716, longitude: 77.5946, recordedAt: BASE_TIME };
    // ~1.1km away, 60s later -> ~18 m/s (~65 km/h), plausible.
    const current = {
      latitude: 12.9816,
      longitude: 77.5946,
      recordedAt: new Date(BASE_TIME.getTime() + 60_000),
    };
    expect(detectImplausibleMovement(previous, current)).toBe(false);
  });

  it("flags a physically-impossible jump across a city in seconds", () => {
    const previous = { latitude: 12.9716, longitude: 77.5946, recordedAt: BASE_TIME };
    // ~50km away, 10s later -> ~5000 m/s, impossible.
    const current = {
      latitude: 13.4,
      longitude: 77.5946,
      recordedAt: new Date(BASE_TIME.getTime() + 10_000),
    };
    expect(detectImplausibleMovement(previous, current)).toBe(true);
  });

  it("does not flag near-instant pings, since jitter alone can imply a huge speed", () => {
    const previous = { latitude: 12.9716, longitude: 77.5946, recordedAt: BASE_TIME };
    const current = {
      latitude: 12.9718,
      longitude: 77.5946,
      recordedAt: new Date(BASE_TIME.getTime() + 500),
    };
    expect(detectImplausibleMovement(previous, current)).toBe(false);
  });

  it("does not flag a stationary provider", () => {
    const previous = { latitude: 12.9716, longitude: 77.5946, recordedAt: BASE_TIME };
    const current = {
      latitude: 12.9716,
      longitude: 77.5946,
      recordedAt: new Date(BASE_TIME.getTime() + 5000),
    };
    expect(detectImplausibleMovement(previous, current)).toBe(false);
  });
});
