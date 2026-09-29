import { useMemo } from "react";

import type { WorkoutSession } from "@/data/workout-log";
import { getGoalProgress, type GoalProgress } from "@/lib/goal-progress";
import { useBodyLogStore } from "@/store/body-log-store";
import { useCurrencyStore } from "@/store/currency-store";
import type { Goal } from "@/store/goals-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

/** How far along a goal is — worked out from whichever of your workouts, body log and food log it measures, and updated as they change. */
export function useGoalProgress(goal: Goal, sessions: Record<string, WorkoutSession>): GoalProgress {
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const foodEntries = useNutritionLogStore((state) => state.entries);
  const proteinTarget = useNutritionTargetsStore((state) => state.proteinG);
  const calorieTarget = useNutritionTargetsStore((state) => state.calories);
  const bodyEntries = useBodyLogStore((state) => state.entries);
  const freezeDateKeys = useCurrencyStore((state) => state.freezeDateKeys);

  return useMemo(
    () => getGoalProgress(goal, { sessions, workouts, foodEntries, proteinTarget, calorieTarget, bodyEntries, freezeDateKeys }),
    [goal, sessions, workouts, foodEntries, proteinTarget, calorieTarget, bodyEntries, freezeDateKeys],
  );
}
