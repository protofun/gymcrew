import { router } from "expo-router";

export type NutritionSection = "diary" | "foods" | "progress" | "history";

const SECTION_PATHS = {
  diary: "/nutrition",
  foods: "/nutrition/my-foods",
  progress: "/nutrition/progress",
  history: "/nutrition/history",
} as const;

/** Returns to a Nutrition hub page from a screen inside Nutrition (add food, food detail, ...): dismisses back to
 * it if it is underneath, so finishing something lands on the page you started from. From outside Nutrition,
 * open it with a plain `router.push("/nutrition")`. */
export function goToNutrition(section: NutritionSection = "diary", params?: { tab?: string; date?: string }): void {
  router.dismissTo({ pathname: SECTION_PATHS[section], params });
}

/** Leaves Nutrition for the rest of the app. */
export function leaveNutrition(): void {
  router.dismissTo("/home");
}

/** Moves between the Nutrition hub pages — replaces, so the hubs never stack up. */
export function switchNutritionSection(section: NutritionSection, params?: { date?: string }): void {
  router.replace({ pathname: SECTION_PATHS[section], params });
}
