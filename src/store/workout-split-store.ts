import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { Weekday } from "@/data/weekdays";
import type { GeneratedPlan, SplitPreferences } from "@/lib/workout-split-generator";
import { useOnboardingStore } from "@/store/onboarding-store";

/**
 * Thin store — it just holds the result. The actual generation (`generateWorkoutSplit`, see
 * lib/workout-split-generator.ts) runs in the screens that need it (setup/reveal), which are the
 * ones with live ranks + workout history to feed it. "Regenerate" is just calling it again with
 * whatever's true right now, so this store never needs to know how to compute anything itself.
 */
type WorkoutSplitData = {
  preferences: SplitPreferences | null;
  plan: GeneratedPlan | null;
  acceptedAt: number | null;
};

type WorkoutSplitStore = WorkoutSplitData & {
  setPreferences: (preferences: SplitPreferences) => void;
  acceptPlan: (plan: GeneratedPlan) => void;
  clearPlan: () => void;
  syncFromServer: () => Promise<void>;
};

function pushWorkoutSplit(get: () => WorkoutSplitStore) {
  const { preferences, plan, acceptedAt } = get();
  pushState("workout-split", { preferences, plan, acceptedAt });
}

export const useWorkoutSplitStore = create<WorkoutSplitStore>()(
  persist(
    (set, get) => ({
      preferences: null,
      plan: null,
      acceptedAt: null,

      setPreferences: (preferences) => {
        set({ preferences });
        pushWorkoutSplit(get);
      },
      acceptPlan: (plan) => {
        set({ plan, acceptedAt: Date.now() });
        pushWorkoutSplit(get);

        // Mirrors into onboarding's own weeklySchedule too — a second, already-battle-tested path
        // to the database (see onboarding-store.ts's setOnboardingData/pushOnboardingBlob), and it
        // means the split also shows up wherever that already renders (the manual Workout Split
        // editor, the training calendar, TodayWorkoutModal) without those screens needing to know
        // this generator exists. A day whose name doesn't match a known template renders as a plain
        // gray silhouette there — same "no data, no claim" fallback any custom-typed name already
        // gets, not a new gap.
        const weeklySchedule: Partial<Record<Weekday, string>> = {};
        for (const day of plan.days) weeklySchedule[day.weekday] = day.name;
        useOnboardingStore.getState().setOnboardingData({ weeklySchedule });
      },
      clearPlan: () => {
        set({ plan: null, acceptedAt: null });
        pushWorkoutSplit(get);
      },
      syncFromServer: () => pullState<WorkoutSplitData>("workout-split", (data) => set(data)),
    }),
    {
      name: "gymcrew-workout-split",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
