/** Ch72's Provider Home redesign wants "2 min ago" style timestamps in the
 * recent-jobs list instead of a full date/time string — this is the whole
 * app's first relative-time formatter, so kept small and local rather than
 * pulling in a date library for one screen's list. */
export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSeconds < 60) {
    return "Just now";
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(isoString).toLocaleDateString();
}
