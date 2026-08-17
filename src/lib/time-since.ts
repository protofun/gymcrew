const DAY_MS = 24 * 60 * 60 * 1000;

/** "2 weeks and 2 days", "3 days", "1 week" — for showing how long it's been since a previous PR. */
export function formatTimeSince(fromMs: number, toMs: number): string {
  const totalDays = Math.max(0, Math.floor((toMs - fromMs) / DAY_MS));
  if (totalDays === 0) return "today";

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  const weekPart = weeks > 0 ? `${weeks} week${weeks === 1 ? "" : "s"}` : "";
  const dayPart = days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "";

  if (weekPart && dayPart) return `${weekPart} and ${dayPart}`;
  return weekPart || dayPart;
}
