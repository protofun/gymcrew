import type { Ionicons } from "@expo/vector-icons";

import type { Gender } from "@/store/onboarding-store";
import type { Macros } from "@/lib/nutrition-macros";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type NutritionGoal = "build_muscle" | "maintain" | "lose_fat" | "custom";

type IconName = keyof typeof Ionicons.glyphMap;

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; description: string; multiplier: number; icon: IconName }[] = [
  { key: "sedentary", label: "Sedentary", description: "Little to no exercise", multiplier: 1.2, icon: "bed-outline" },
  { key: "light", label: "Lightly Active", description: "Light exercise 1-3 days/week", multiplier: 1.375, icon: "walk-outline" },
  { key: "moderate", label: "Moderately Active", description: "Moderate exercise 3-5 days/week", multiplier: 1.55, icon: "bicycle-outline" },
  { key: "active", label: "Active", description: "Hard exercise 6-7 days/week", multiplier: 1.725, icon: "barbell-outline" },
  { key: "very_active", label: "Very Active", description: "Very hard exercise & physical job", multiplier: 1.9, icon: "flame-outline" },
];

export const NUTRITION_GOALS: { key: NutritionGoal; label: string; description: string; icon: IconName }[] = [
  { key: "build_muscle", label: "Build Muscle", description: "Calorie surplus, higher protein", icon: "trending-up-outline" },
  { key: "maintain", label: "Maintain", description: "Stay around your current weight", icon: "checkmark-circle-outline" },
  { key: "lose_fat", label: "Lose Fat", description: "Calorie deficit, protein preserved", icon: "trending-down-outline" },
  { key: "custom", label: "Custom", description: "Set your own numbers", icon: "create-outline" },
];

/** Protein target per kg of bodyweight, by goal — higher in a deficit to preserve muscle. */
const PROTEIN_G_PER_KG: Record<Exclude<NutritionGoal, "custom">, number> = {
  build_muscle: 2,
  maintain: 1.8,
  lose_fat: 2.2,
};

const CALORIE_ADJUSTMENT: Record<Exclude<NutritionGoal, "custom">, number> = {
  build_muscle: 300,
  maintain: 0,
  lose_fat: -500,
};

const MIN_CALORIES = 1200;
const FAT_CALORIE_SHARE = 0.25;

/**
 * A rough, estimate-only daily target (Mifflin-St Jeor BMR × activity multiplier, then adjusted for
 * goal) — see NUTRITION.md section 20. Always shown to the user as an estimate, never medical
 * advice, and always overridable (see nutrition-targets-store.ts's `isCustom` flag).
 */
export function calculateSuggestedTargets(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Exclude<NutritionGoal, "custom">;
}): Macros {
  const { weightKg, heightCm, age, gender, activityLevel, goal } = input;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161);
  const multiplier = ACTIVITY_LEVELS.find((level) => level.key === activityLevel)?.multiplier ?? 1.375;
  const tdee = bmr * multiplier;
  const calories = Math.max(MIN_CALORIES, Math.round(tdee + CALORIE_ADJUSTMENT[goal]));

  const proteinG = Math.round(weightKg * PROTEIN_G_PER_KG[goal]);
  const fatG = Math.round((calories * FAT_CALORIE_SHARE) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbsG, fatG };
}
