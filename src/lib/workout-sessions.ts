import type { MuscleGroup, WorkoutSession } from "@/data/workout-log";
import { toDateKey } from "@/lib/date";
import { estimateOneRepMax } from "@/lib/workout-metrics";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** ~MET 6 (moderate-intensity resistance training), scaled off an 80kg reference bodyweight. */
function estimateCalories(durationMin: number, bodyWeightKg: number): number {
  return Math.round(durationMin * 6 * (bodyWeightKg / 80));
}

function primaryExerciseOf(workout: CompletedWorkout): WorkoutSession["primaryExercise"] {
  let best: { name: string; exerciseId: string; weightKg: number; reps: number } | null = null;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (!set.completed || set.isWarmup || set.weightKg == null) continue;
      if (!best || set.weightKg > best.weightKg) {
        best = { name: exercise.name, exerciseId: exercise.exerciseId, weightKg: set.weightKg, reps: set.reps ?? 0 };
      }
    }
  }
  if (!best) return { name: workout.name, reps: 0, oneRepMaxKg: 0 };
  return { name: best.name, exerciseId: best.exerciseId, reps: best.reps, oneRepMaxKg: estimateOneRepMax(best.weightKg, best.reps) };
}

function toSession(workout: CompletedWorkout, bodyWeightKg: number): WorkoutSession {
  const durationMin = Math.round(workout.durationSeconds / 60);
  return {
    name: workout.name,
    exercises: workout.exercises.length,
    durationMin,
    volumeKg: Math.round(workout.volumeKg),
    calories: estimateCalories(durationMin, bodyWeightKg),
    muscleIntensity: workout.muscleIntensity,
    primaryExercise: primaryExerciseOf(workout),
  };
}

/** Same-day workouts are rare but possible — folds them into one session so every consumer's
 * "one session per calendar day" assumption still holds. */
function mergeSessions(a: WorkoutSession, b: WorkoutSession): WorkoutSession {
  const muscleIntensity: WorkoutSession["muscleIntensity"] = { ...a.muscleIntensity };
  for (const [group, value] of Object.entries(b.muscleIntensity) as [MuscleGroup, number][]) {
    muscleIntensity[group] = Math.min(10, (muscleIntensity[group] ?? 0) + value);
  }
  return {
    name: a.name,
    exercises: a.exercises + b.exercises,
    durationMin: a.durationMin + b.durationMin,
    volumeKg: a.volumeKg + b.volumeKg,
    calories: a.calories + b.calories,
    muscleIntensity,
    primaryExercise: b.primaryExercise.oneRepMaxKg > a.primaryExercise.oneRepMaxKg ? b.primaryExercise : a.primaryExercise,
  };
}

/**
 * Adapts real completed-workout history into the day-keyed `WorkoutSession` shape the home
 * page's widgets (Muscle Suggestions, Last Workout, Goals) already consume — real logged training
 * instead of the old MOCK_WORKOUT_SESSIONS placeholder.
 */
export function deriveWorkoutSessions(workouts: CompletedWorkout[], bodyWeightKg: number): Record<string, WorkoutSession> {
  const sessions: Record<string, WorkoutSession> = {};
  for (const workout of workouts) {
    const dateKey = toDateKey(new Date(workout.completedAt));
    const session = toSession(workout, bodyWeightKg);
    sessions[dateKey] = sessions[dateKey] ? mergeSessions(sessions[dateKey], session) : session;
  }
  return sessions;
}
