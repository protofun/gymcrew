import type { WorkoutSession } from "@/data/workout-log";
import type { ApiFoodLog } from "@/lib/api";
import { computeCurrentStreak } from "@/lib/streak";
import type { BodyLogEntry } from "@/store/body-log-store";
import type { Goal, GoalMetric } from "@/store/goals-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** Everything an automatic goal can be worked out from. */
export type GoalData = {
  sessions: Record<string, WorkoutSession>;
  workouts: CompletedWorkout[];
  foodEntries: ApiFoodLog[];
  proteinTarget: number | null;
  calorieTarget: number | null;
  /** Newest first, as the body log keeps them. */
  bodyEntries: BodyLogEntry[];
  freezeDateKeys: string[];
};

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Food logged this month, added up per day: `{ "2026-09-21": { calories, proteinG } }`. */
function foodPerDayThisMonth(entries: ApiFoodLog[], referenceDate: Date): Record<string, { calories: number; proteinG: number }> {
  const days: Record<string, { calories: number; proteinG: number }> = {};
  for (const entry of entries) {
    if (!isSameMonth(parseDateKey(entry.dateKey), referenceDate)) continue;
    const day = days[entry.dateKey] ?? { calories: 0, proteinG: 0 };
    day.calories += entry.calories;
    day.proteinG += entry.proteinG;
    days[entry.dateKey] = day;
  }
  return days;
}

/** Computes this month's value for an auto-tracked metric from real data. */
function getAutoValue(goal: Goal, data: GoalData, referenceDate: Date): number {
  const thisMonthSessions = Object.entries(data.sessions)
    .filter(([dateKey]) => isSameMonth(parseDateKey(dateKey), referenceDate))
    .map(([, session]) => session);

  const metric: GoalMetric = goal.metric;
  switch (metric) {
    case "volume":
      return thisMonthSessions.reduce((sum, session) => sum + session.volumeKg, 0);
    case "strength":
      return thisMonthSessions.length ? Math.max(...thisMonthSessions.map((session) => session.primaryExercise.oneRepMaxKg)) : 0;
    case "endurance":
      return thisMonthSessions.reduce((sum, session) => sum + session.durationMin, 0);
    case "workouts":
      return thisMonthSessions.length;
    case "streak":
      return computeCurrentStreak(data.workouts, referenceDate, data.freezeDateKeys);
    case "weight":
      // The newest weigh-in; until there is one, the goal simply sits at its starting weight.
      return data.bodyEntries[0]?.weightKg ?? goal.startValue;
    case "logging":
      return Object.keys(foodPerDayThisMonth(data.foodEntries, referenceDate)).length;
    case "protein": {
      if (!data.proteinTarget) return 0;
      const target = data.proteinTarget;
      return Object.values(foodPerDayThisMonth(data.foodEntries, referenceDate)).filter((day) => day.proteinG >= target).length;
    }
    case "calories": {
      if (!data.calorieTarget) return 0;
      const target = data.calorieTarget;
      // "On target" is within 10% either side of the day's calorie target.
      return Object.values(foodPerDayThisMonth(data.foodEntries, referenceDate)).filter((day) => Math.abs(day.calories - target) <= target * 0.1).length;
    }
    case "custom":
      return goal.manualCurrentValue; // custom goals are always manual
  }
}

export type GoalProgress = {
  currentValue: number;
  ratio: number;
};

export function getGoalProgress(goal: Goal, data: GoalData): GoalProgress {
  const currentValue = goal.trackingMode === "auto" && goal.metric !== "custom" ? getAutoValue(goal, data, new Date()) : goal.manualCurrentValue;

  const span = goal.direction === "decrease" ? goal.startValue - goal.targetValue : goal.targetValue - goal.startValue;
  const progressed = goal.direction === "decrease" ? goal.startValue - currentValue : currentValue - goal.startValue;
  const ratio = span > 0 ? Math.max(0, Math.min(1, progressed / span)) : 0;

  return { currentValue, ratio };
}
