import { colors } from "@/theme";

/** Mock goal progress until a real goal-tracking feature exists. */
export type Goal = {
  label: string;
  icon: string;
  color: string;
  progress: number; // 0-1
};

export const GOALS: Goal[] = [
  { label: "Build Muscle", icon: "barbell", color: colors.brand.yellow, progress: 0.75 },
  { label: "Increase Strength", icon: "flash", color: colors.semantic.info, progress: 0.45 },
  { label: "Improve Endurance", icon: "heart", color: colors.semantic.success, progress: 0.8 },
  { label: "Lose Weight", icon: "trending-down", color: colors.semantic.streak, progress: 0.3 },
];
