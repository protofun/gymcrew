import { ALL_MUSCLE_GROUPS, type MuscleGroup, type WorkoutSession } from "@/data/workout-log";
import { toDateKey } from "@/lib/date";

export type SuggestionPriority = "High" | "Medium";

export type MuscleSuggestion = {
  group: MuscleGroup;
  priority: SuggestionPriority;
};

function getWeeklyMuscleTotals(
  sessions: Record<string, WorkoutSession>,
  referenceDate: Date,
): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(ALL_MUSCLE_GROUPS.map((group) => [group, 0])) as Record<MuscleGroup, number>;

  const start = new Date(referenceDate);
  start.setDate(start.getDate() - 6); // last 7 days, including today

  for (let d = new Date(start); d <= referenceDate; d.setDate(d.getDate() + 1)) {
    const session = sessions[toDateKey(d)];
    if (!session) continue;
    for (const [group, intensity] of Object.entries(session.muscleIntensity) as [MuscleGroup, number][]) {
      totals[group] += intensity;
    }
  }

  return totals;
}

/** Ranks the least-trained muscle groups over the past 7 days, least first. */
export function getMuscleSuggestions(
  sessions: Record<string, WorkoutSession>,
  referenceDate: Date,
  limit = 3,
): MuscleSuggestion[] {
  const totals = getWeeklyMuscleTotals(sessions, referenceDate);

  return ALL_MUSCLE_GROUPS.map((group) => ({ group, total: totals[group] }))
    .sort((a, b) => a.total - b.total)
    .slice(0, limit)
    .map(({ group, total }) => ({ group, priority: (total === 0 ? "High" : "Medium") as SuggestionPriority }));
}
