import { addDays, toDateKey } from "@/lib/date";

/** Days in a row with something in the food log, ending today — or yesterday, when today is still
 * empty (the day isn't over yet, so it doesn't break the streak until a whole day is skipped). */
export function computeLoggingStreak(loggedDateKeys: Set<string>, now: Date = new Date()): number {
  let day = loggedDateKeys.has(toDateKey(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (loggedDateKeys.has(toDateKey(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** The longest run of consecutive days with something logged, ever. */
export function computeLongestLoggingStreak(loggedDateKeys: Set<string>): number {
  let longest = 0;
  for (const key of loggedDateKeys) {
    // Only count from the first day of a run, so each run is measured once.
    const [year, month, day] = key.split("-").map(Number);
    if (loggedDateKeys.has(toDateKey(addDays(new Date(year, month - 1, day), -1)))) continue;
    let length = 0;
    let cursor = new Date(year, month - 1, day);
    while (loggedDateKeys.has(toDateKey(cursor))) {
      length += 1;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}
