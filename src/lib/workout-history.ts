import type { WorkoutSession } from "@/data/workout-log";
import { fromDateKey, toDateKey } from "@/lib/date";

export type LastWorkout = {
  date: Date;
  session: WorkoutSession;
};

/** The most recently logged session on or before the reference date. */
export function getLastWorkout(
  sessions: Record<string, WorkoutSession>,
  referenceDate: Date,
): LastWorkout | null {
  const referenceDateKey = toDateKey(referenceDate);
  let latestKey: string | null = null;

  for (const dateKey of Object.keys(sessions)) {
    if (dateKey > referenceDateKey) continue;
    if (!latestKey || dateKey > latestKey) latestKey = dateKey;
  }

  if (!latestKey) return null;
  return { date: fromDateKey(latestKey), session: sessions[latestKey] };
}
