import type { WorkoutSession } from "@/data/workout-log";
import type { Goal, GoalMetric } from "@/store/goals-store";

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Computes this month's value for an auto-tracked metric from real session data. */
function getAutoValue(metric: GoalMetric, sessions: Record<string, WorkoutSession>, referenceDate: Date): number {
  const thisMonthSessions = Object.entries(sessions)
    .filter(([dateKey]) => isSameMonth(parseDateKey(dateKey), referenceDate))
    .map(([, session]) => session);

  switch (metric) {
    case "volume":
      return thisMonthSessions.reduce((sum, session) => sum + session.volumeKg, 0);
    case "strength":
      return thisMonthSessions.length
        ? Math.max(...thisMonthSessions.map((session) => session.primaryExercise.oneRepMaxKg))
        : 0;
    case "endurance":
      return thisMonthSessions.reduce((sum, session) => sum + session.durationMin, 0);
    case "weight":
      return 0; // no bodyweight log exists yet — weight goals are manual-only
    case "custom":
      return 0; // custom goals are always manual-only
  }
}

export type GoalProgress = {
  currentValue: number;
  ratio: number;
};

export function getGoalProgress(goal: Goal, sessions: Record<string, WorkoutSession>): GoalProgress {
  const currentValue =
    goal.trackingMode === "auto" ? getAutoValue(goal.metric, sessions, new Date()) : goal.manualCurrentValue;

  const span = goal.direction === "decrease" ? goal.startValue - goal.targetValue : goal.targetValue - goal.startValue;
  const progressed = goal.direction === "decrease" ? goal.startValue - currentValue : currentValue - goal.startValue;
  const ratio = span > 0 ? Math.max(0, Math.min(1, progressed / span)) : 0;

  return { currentValue, ratio };
}
