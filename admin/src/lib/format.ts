/** "2 min ago" / "just now" / "3d ago" — used by the Dashboard's Live Activity Feed and (later)
 * the Users page's "last active" column. */
export function formatTimeAgo(timestampMs: number): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
