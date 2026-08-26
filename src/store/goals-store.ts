import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import { colors } from "@/theme";

export type TrackingMode = "auto" | "manual";
export type GoalMetric = "volume" | "strength" | "endurance" | "weight" | "custom";

export type Goal = {
  id: string;
  label: string;
  icon: string;
  color: string;
  metric: GoalMetric;
  direction: "increase" | "decrease";
  trackingMode: TrackingMode;
  startValue: number;
  targetValue: number;
  manualCurrentValue: number;
  unit: string;
};

const DEFAULT_GOALS: Goal[] = [
  {
    id: "build-muscle",
    label: "Build Muscle",
    icon: "barbell",
    color: colors.brand.yellow,
    metric: "volume",
    direction: "increase",
    trackingMode: "auto",
    startValue: 0,
    targetValue: 120000,
    manualCurrentValue: 0,
    unit: "kg lifted",
  },
  {
    id: "increase-strength",
    label: "Increase Strength",
    icon: "flash",
    color: colors.semantic.info,
    metric: "strength",
    direction: "increase",
    trackingMode: "auto",
    startValue: 0,
    targetValue: 150,
    manualCurrentValue: 0,
    unit: "kg 1RM",
  },
  {
    id: "improve-endurance",
    label: "Improve Endurance",
    icon: "heart",
    color: colors.semantic.success,
    metric: "endurance",
    direction: "increase",
    trackingMode: "auto",
    startValue: 0,
    targetValue: 600,
    manualCurrentValue: 0,
    unit: "min trained",
  },
  {
    id: "lose-weight",
    label: "Lose Weight",
    icon: "trending-down",
    color: colors.semantic.streak,
    metric: "weight",
    direction: "decrease",
    trackingMode: "manual",
    startValue: 85,
    targetValue: 75,
    manualCurrentValue: 85,
    unit: "kg",
  },
];

type GoalsStore = {
  goals: Goal[];
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  addGoal: (goal: Omit<Goal, "id">) => void;
  removeGoal: (id: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      goals: DEFAULT_GOALS,
      updateGoal: (id, updates) => {
        const goals = get().goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal));
        set({ goals });
        pushState("goals", { goals });
      },
      addGoal: (goal) => {
        const goals = [...get().goals, { ...goal, id: `custom-${Date.now()}` }];
        set({ goals });
        pushState("goals", { goals });
      },
      removeGoal: (id) => {
        const goals = get().goals.filter((goal) => goal.id !== id);
        set({ goals });
        pushState("goals", { goals });
      },
      syncFromServer: () => pullState<{ goals: Goal[] }>("goals", (data) => set(data)),
    }),
    {
      name: "gymcrew-goals",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
