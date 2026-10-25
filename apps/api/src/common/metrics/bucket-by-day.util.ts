const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The inclusive list of UTC-midnight days from `since` through `since + days`. */
function dayRange(since: Date, days: number): Date[] {
  const start = toUtcMidnight(since);
  return Array.from({ length: days + 1 }, (_, i) => new Date(start.getTime() + i * MS_PER_DAY));
}

export interface DailyCount {
  date: string;
  count: number;
}

/**
 * Buckets timestamps into daily counts, UTC, covering every day in
 * [since, since + days] inclusive even if a day has zero events — so a
 * chart never silently skips a date.
 */
export function bucketCountsByDay(timestamps: Date[], since: Date, days: number): DailyCount[] {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    const key = toDateString(toUtcMidnight(timestamp));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return dayRange(since, days).map((day) => {
    const date = toDateString(day);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export interface CumulativeCount {
  date: string;
  cumulative: number;
}

/**
 * Same day range as bucketCountsByDay, but each day's value is
 * baselineCount plus every timestamp at or before that day — a running
 * total, not a daily delta.
 */
export function cumulativeCountsByDay(
  timestamps: Date[],
  since: Date,
  days: number,
  baselineCount: number,
): CumulativeCount[] {
  const daily = bucketCountsByDay(timestamps, since, days);
  let running = baselineCount;
  return daily.map(({ date, count }) => {
    running += count;
    return { date, cumulative: running };
  });
}
