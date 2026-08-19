import { todaysScheduledWorkout } from "@/lib/weekly-schedule";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { activeTodayOverride, useTodayTrainingStore } from "@/store/today-training-store";

export type TodayWorkout = {
  /** Display name — "Rest Day" when explicitly overridden to rest. */
  workoutName: string;
  isRestDay: boolean;
  /** True when the user manually overrode today, rather than it coming from their weekly schedule / crew default. */
  isOverridden: boolean;
};

/** Resolves what the current user is training today: manual override > weekly schedule > the crew's default plan. */
export function useTodayWorkout(): TodayWorkout {
  const weeklySchedule = useOnboardingStore((state) => state.onboarding.weeklySchedule);
  const fallback = useCrewStore((state) => state.todayPlan.workoutName);
  const overrideDate = useTodayTrainingStore((state) => state.overrideDate);
  const overrideWorkoutName = useTodayTrainingStore((state) => state.overrideWorkoutName);

  const override = activeTodayOverride({ overrideDate, overrideWorkoutName });
  if (override !== null) {
    return { workoutName: override === "" ? "Rest Day" : override, isRestDay: override === "", isOverridden: true };
  }

  const scheduled = todaysScheduledWorkout(weeklySchedule);
  if (scheduled) return { workoutName: scheduled, isRestDay: false, isOverridden: false };

  return { workoutName: fallback, isRestDay: false, isOverridden: false };
}
