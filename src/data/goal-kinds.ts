import type { Ionicons } from "@expo/vector-icons";

import type { GoalMetric } from "@/store/goals-store";
import { colors } from "@/theme";

export type GoalKind = {
  key: GoalMetric;
  label: string;
  /** True when the app works the number out itself. */
  auto: boolean;
  /** Where the number comes from, in a few words. */
  hint: string;
  unit: string;
  target: number;
  min: number;
  max: number;
  step: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

/** What a goal can measure. Everything but "My own" is calculated automatically from what you already log. */
export const GOAL_KINDS: GoalKind[] = [
  { key: "custom", label: "My own", auto: false, hint: "You update it yourself.", unit: "km", target: 5, min: 1, max: 100, step: 1, icon: "flag", color: colors.brand.yellow },
  { key: "workouts", label: "Workouts", auto: true, hint: "Workouts you log this month.", unit: "workouts", target: 12, min: 1, max: 31, step: 1, icon: "barbell", color: colors.brand.yellow },
  { key: "volume", label: "Volume lifted", auto: true, hint: "Total kg you lift this month.", unit: "kg lifted", target: 100000, min: 5000, max: 1000000, step: 5000, icon: "fitness", color: colors.semantic.info },
  { key: "strength", label: "Best 1RM", auto: true, hint: "Your best estimated 1RM this month.", unit: "kg 1RM", target: 150, min: 20, max: 400, step: 5, icon: "flash", color: colors.semantic.info },
  { key: "endurance", label: "Minutes trained", auto: true, hint: "Minutes you train this month.", unit: "min trained", target: 600, min: 60, max: 3000, step: 30, icon: "timer", color: colors.semantic.success },
  { key: "streak", label: "Training streak", auto: true, hint: "Days in a row you train.", unit: "days", target: 30, min: 2, max: 100, step: 1, icon: "flame", color: colors.semantic.streak },
  { key: "weight", label: "Body weight", auto: true, hint: "Your latest weigh-in from the body log.", unit: "kg", target: 75, min: 30, max: 200, step: 0.5, icon: "scale", color: colors.semantic.streak },
  { key: "protein", label: "Protein days", auto: true, hint: "Days this month you hit your protein target.", unit: "days", target: 20, min: 1, max: 31, step: 1, icon: "nutrition", color: colors.semantic.success },
  { key: "calories", label: "Calorie days", auto: true, hint: "Days this month within 10% of your calorie target.", unit: "days", target: 20, min: 1, max: 31, step: 1, icon: "speedometer", color: colors.semantic.streak },
  { key: "logging", label: "Food logging", auto: true, hint: "Days this month you log your food.", unit: "days", target: 25, min: 1, max: 31, step: 1, icon: "restaurant", color: colors.semantic.info },
];

export function goalKind(metric: GoalMetric): GoalKind {
  return GOAL_KINDS.find((kind) => kind.key === metric) ?? GOAL_KINDS[0];
}

/** The units a goal of your own can be in, each with how the ruler behaves for it. */
export const CUSTOM_UNITS = [
  { key: "km", min: 1, max: 100, step: 1 },
  { key: "kg", min: 1, max: 300, step: 1 },
  { key: "%", min: 1, max: 100, step: 1 },
  { key: "reps", min: 1, max: 500, step: 1 },
  { key: "min", min: 5, max: 300, step: 5 },
  { key: "steps", min: 1000, max: 30000, step: 500 },
  { key: "kcal", min: 100, max: 5000, step: 50 },
  { key: "g", min: 5, max: 500, step: 5 },
  { key: "L", min: 1, max: 10, step: 0.5 },
] as const;

/** What the ruler offers for a goal's target: its range and how much one tick is worth. */
export function targetSpec(metric: GoalMetric, unit: string, target: number): { min: number; max: number; step: number } {
  if (metric !== "custom") {
    const kind = goalKind(metric);
    return { min: kind.min, max: Math.max(kind.max, target), step: kind.step };
  }
  const custom = CUSTOM_UNITS.find((option) => option.key === unit);
  if (custom) return { min: custom.min, max: Math.max(custom.max, target), step: custom.step };
  return { min: 1, max: Math.max(100, Math.ceil((target * 3) / 10) * 10), step: 1 };
}

/** Starting points to tap instead of typing — each fills in the kind, name, icon, color and target. */
export const GOAL_PRESETS: { key: string; label: string; metric: GoalMetric; icon: keyof typeof Ionicons.glyphMap; color: string; target: number; unit?: string; weightChange?: number }[] = [
  { key: "train", label: "Train 12× this month", metric: "workouts", icon: "barbell", color: colors.brand.yellow, target: 12 },
  { key: "streak", label: "30-day streak", metric: "streak", icon: "flame", color: colors.semantic.streak, target: 30 },
  { key: "protein", label: "Hit protein 20 days", metric: "protein", icon: "nutrition", color: colors.semantic.success, target: 20 },
  { key: "logging", label: "Log food 25 days", metric: "logging", icon: "restaurant", color: colors.semantic.info, target: 25 },
  { key: "lose", label: "Lose 5 kg", metric: "weight", icon: "trending-down", color: colors.semantic.streak, target: 0, weightChange: -5 },
  { key: "5k", label: "Run a 5K", metric: "custom", icon: "walk", color: colors.semantic.success, target: 5, unit: "km" },
  { key: "steps", label: "10K steps", metric: "custom", icon: "footsteps", color: colors.semantic.streak, target: 10000, unit: "steps" },
];

/** Icons to pick from — training first, then food and drink, then the rest. */
export const GOAL_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "barbell", "fitness", "body", "walk", "footsteps", "bicycle", "timer", "stopwatch", "speedometer", "flame", "flash", "pulse",
  "heart", "trending-up", "trophy", "medal", "ribbon", "rocket", "basketball", "football", "boat",
  "nutrition", "restaurant", "fast-food", "cafe", "water", "leaf", "fish", "pizza", "egg", "ice-cream",
  "moon", "sunny", "star", "flag", "scale", "calendar",
];
