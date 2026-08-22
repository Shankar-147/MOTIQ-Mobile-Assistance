import { resolveThrottleTracker } from "./throttle-tracker.util";

describe("resolveThrottleTracker", () => {
  it("uses the JWT subject when a Bearer token decodes to one", () => {
    const tracker = resolveThrottleTracker("Bearer abc.def.ghi", () => "user-123", "1.2.3.4");
    expect(tracker).toBe("user:user-123");
  });

  it("falls back to IP when there is no Authorization header", () => {
    const tracker = resolveThrottleTracker(undefined, () => "user-123", "1.2.3.4");
    expect(tracker).toBe("ip:1.2.3.4");
  });

  it("falls back to IP when the header isn't a Bearer token", () => {
    const tracker = resolveThrottleTracker("Basic xyz", () => "user-123", "1.2.3.4");
    expect(tracker).toBe("ip:1.2.3.4");
  });

  it("falls back to IP when the token doesn't decode to a subject", () => {
    const tracker = resolveThrottleTracker("Bearer malformed", () => null, "1.2.3.4");
    expect(tracker).toBe("ip:1.2.3.4");
  });
});
