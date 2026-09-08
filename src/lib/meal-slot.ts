export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

/** Guesses which meal a food logged right now belongs in, so quick-adding never forces a picker —
 * the user can still override it (see the meal slot chip in add.tsx / food/[id].tsx). */
export function mealSlotForTime(date: Date = new Date()): MealSlot {
  const hour = date.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snacks";
}
