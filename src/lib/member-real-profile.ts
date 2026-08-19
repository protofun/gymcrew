import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import type { Achievement, StrengthPoint } from "@/lib/member-mock-profile";
import type { MuscleGroup, MuscleIntensity } from "@/data/workout-log";
import type { PersonalRecord } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

export function realMemberStats(workouts: CompletedWorkout[]) {
  return {
    workoutsCount: workouts.length,
    volumeKg: workouts.reduce((sum, workout) => sum + workout.volumeKg, 0),
    prsCount: workouts.reduce((sum, workout) => sum + workout.prs.length, 0),
  };
}

export function realMemberAchievements(records: Record<string, PersonalRecord>, limit = 20): Achievement[] {
  return Object.values(records)
    .sort((a, b) => b.achievedAt - a.achievedAt)
    .slice(0, limit)
    .map((record) => ({
      id: record.exerciseId,
      exerciseName: record.exerciseName,
      weightKg: record.bestWeightKg,
      reps: record.bestReps,
      achievedAt: record.achievedAt,
    }));
}

/** Per-exercise history of the heaviest completed set that day, across every logged workout. */
export function realStrengthProgress(workouts: CompletedWorkout[]): Record<string, StrengthPoint[]> {
  const chronological = [...workouts].reverse(); // stored newest-first
  const byExercise: Record<string, StrengthPoint[]> = {};

  for (const workout of chronological) {
    for (const exercise of workout.exercises) {
      const heaviest = exercise.sets
        .filter((set) => set.completed && !set.isWarmup && set.weightKg !== null)
        .reduce<number | null>((max, set) => {
          const weight = set.weightKg as number;
          return max === null || weight > max ? weight : max;
        }, null);
      if (heaviest === null) continue;

      const dateKey = toDateKey(new Date(workout.completedAt));
      byExercise[exercise.name] = [...(byExercise[exercise.name] ?? []), { date: dateKey, value: heaviest }];
    }
  }

  return byExercise;
}

export function realCurrentWeekMuscleIntensity(workouts: CompletedWorkout[]): MuscleIntensity {
  const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
  const merged: MuscleIntensity = {};

  for (const workout of workouts) {
    const dateKey = toDateKey(new Date(workout.completedAt));
    if (!weekKeys.has(dateKey)) continue;
    for (const [group, intensity] of Object.entries(workout.muscleIntensity) as [MuscleGroup, number][]) {
      merged[group] = Math.min(10, (merged[group] ?? 0) + intensity);
    }
  }

  return merged;
}
