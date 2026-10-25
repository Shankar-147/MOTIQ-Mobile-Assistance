import { bucketCountsByDay, cumulativeCountsByDay } from "./bucket-by-day.util";

describe("bucketCountsByDay", () => {
  it("zero-fills every day in range when given no timestamps", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const result = bucketCountsByDay([], since, 3);
    expect(result).toEqual([
      { date: "2026-01-01", count: 0 },
      { date: "2026-01-02", count: 0 },
      { date: "2026-01-03", count: 0 },
      { date: "2026-01-04", count: 0 },
    ]);
  });

  it("groups timestamps into their UTC day", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const timestamps = [
      new Date("2026-01-02T05:00:00Z"),
      new Date("2026-01-02T23:59:00Z"),
      new Date("2026-01-03T00:00:01Z"),
    ];
    const result = bucketCountsByDay(timestamps, since, 3);
    expect(result.find((r) => r.date === "2026-01-02")?.count).toBe(2);
    expect(result.find((r) => r.date === "2026-01-03")?.count).toBe(1);
  });
});

describe("cumulativeCountsByDay", () => {
  it("adds baselineCount to every day, including the first", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const result = cumulativeCountsByDay([], since, 2, 10);
    expect(result).toEqual([
      { date: "2026-01-01", cumulative: 10 },
      { date: "2026-01-02", cumulative: 10 },
      { date: "2026-01-03", cumulative: 10 },
    ]);
  });

  it("accumulates timestamps day over day", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const timestamps = [new Date("2026-01-01T12:00:00Z"), new Date("2026-01-02T12:00:00Z")];
    const result = cumulativeCountsByDay(timestamps, since, 2, 0);
    expect(result.map((r) => r.cumulative)).toEqual([1, 2, 2]);
  });
});
