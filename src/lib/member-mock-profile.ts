import type { MuscleGroup, MuscleIntensity, WorkoutSession } from "@/data/workout-log";
import { fromDateKey, getCurrentWeekDates, toDateKey } from "@/lib/date";

export type StrengthPoint = { date: string; value: number };
export type Achievement = { id: string; exerciseName: string; weightKg: number; reps: number; achievedAt: number };

/** Per-exercise 1RM history, derived from each mock session's "primary exercise" for that day. */
export function memberStrengthProgress(sessions: Record<string, WorkoutSession>): Record<string, StrengthPoint[]> {
  const byExercise: Record<string, StrengthPoint[]> = {};
  for (const dateKey of Object.keys(sessions).sort()) {
    const { name, oneRepMaxKg } = sessions[dateKey].primaryExercise;
    byExercise[name] = [...(byExercise[name] ?? []), { date: dateKey, value: oneRepMaxKg }];
  }
  return byExercise;
}

/** A "PR" is any day a primary exercise's 1RM beat its running max so far — newest first. */
export function memberAchievements(sessions: Record<string, WorkoutSession>, limit = 20): Achievement[] {
  const runningMax: Record<string, number> = {};
  const achievements: Achievement[] = [];

  for (const dateKey of Object.keys(sessions).sort()) {
    const { name, oneRepMaxKg } = sessions[dateKey].primaryExercise;
    if (oneRepMaxKg > (runningMax[name] ?? 0)) {
      runningMax[name] = oneRepMaxKg;
      achievements.push({
        id: `${name}-${dateKey}`,
        exerciseName: name,
        weightKg: oneRepMaxKg,
        // A PR is a single heavy set, not the session's total rep count — a small plausible rep range instead.
        reps: 3 + (hashString(`${name}-${dateKey}`) % 6),
        achievedAt: fromDateKey(dateKey).getTime(),
      });
    }
  }

  return achievements.sort((a, b) => b.achievedAt - a.achievedAt).slice(0, limit);
}

export function memberStats(sessions: Record<string, WorkoutSession>) {
  const values = Object.values(sessions);
  return {
    workoutsCount: values.length,
    volumeKg: values.reduce((sum, session) => sum + session.volumeKg, 0),
    prsCount: memberAchievements(sessions, 999).length,
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** Deterministic personal level progress — there's no real per-person XP system yet, so this applies uniformly to every member (including the current user) rather than treating them specially. */
export function memberXp(member: { id: string; level: number }): { xp: number; xpToNextLevel: number } {
  const hash = hashString(member.id);
  const xpToNextLevel = member.level * 625;
  const fraction = 0.35 + (hash % 55) / 100;
  return { xp: Math.round(xpToNextLevel * fraction), xpToNextLevel };
}

export function memberCurrentWeekMuscleIntensity(sessions: Record<string, WorkoutSession>): MuscleIntensity {
  const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
  const merged: MuscleIntensity = {};

  for (const [dateKey, session] of Object.entries(sessions)) {
    if (!weekKeys.has(dateKey)) continue;
    for (const [group, intensity] of Object.entries(session.muscleIntensity) as [MuscleGroup, number][]) {
      merged[group] = Math.min(10, (merged[group] ?? 0) + intensity);
    }
  }

  return merged;
}
