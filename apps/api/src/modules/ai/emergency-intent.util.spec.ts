import { detectEmergencyIntent } from "./emergency-intent.util";

describe("detectEmergencyIntent", () => {
  it("detects an obvious emergency message", () => {
    expect(detectEmergencyIntent("There's been an accident and someone is bleeding")).toBe(true);
  });

  it("detects emergency keywords regardless of case", () => {
    expect(detectEmergencyIntent("HELP, FIRE near the car")).toBe(true);
  });

  it("does not flag a routine roadside-assistance question", () => {
    expect(detectEmergencyIntent("How long until my provider arrives?")).toBe(false);
  });

  it("does not flag a flat-tyre request as an emergency", () => {
    expect(detectEmergencyIntent("I have a flat tyre, can someone help")).toBe(false);
  });
});
