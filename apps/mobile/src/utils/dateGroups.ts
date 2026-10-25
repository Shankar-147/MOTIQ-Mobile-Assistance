function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(createdAt: string, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(createdAt))) / 86_400_000);
}

/** List-section heading for a timestamp: Today / Yesterday / This week / Earlier. */
export function groupLabel(createdAt: string, now: Date): string {
  const days = daysAgo(createdAt, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return "Earlier";
}

/** "9:11 pm" for today/yesterday, "11 Sept, 1:53 pm" otherwise. */
export function timeLabel(createdAt: string, now: Date): string {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (daysAgo(createdAt, now) <= 1) return time;
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
}

/** Groups already-ordered rows into labelled sections, keeping first-seen order. */
export function groupByDate<T>(rows: T[], getDate: (row: T) => string, now: Date): { title: string; data: T[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, T[]>();
  for (const row of rows) {
    const label = groupLabel(getDate(row), now);
    if (!byGroup.has(label)) {
      byGroup.set(label, []);
      order.push(label);
    }
    byGroup.get(label)!.push(row);
  }
  return order.map((title) => ({ title, data: byGroup.get(title)! }));
}
