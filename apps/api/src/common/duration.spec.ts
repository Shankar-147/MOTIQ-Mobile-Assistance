import { parseDurationSeconds } from "./duration";

describe("parseDurationSeconds", () => {
  it("parses minutes, hours, and days", () => {
    expect(parseDurationSeconds("15m")).toBe(15 * 60);
    expect(parseDurationSeconds("1h")).toBe(3600);
    expect(parseDurationSeconds("30d")).toBe(30 * 86400);
  });

  it("parses seconds", () => {
    expect(parseDurationSeconds("45s")).toBe(45);
  });

  it("rejects an unrecognized format", () => {
    expect(() => parseDurationSeconds("15")).toThrow();
    expect(() => parseDurationSeconds("15 minutes")).toThrow();
    expect(() => parseDurationSeconds("")).toThrow();
  });
});
