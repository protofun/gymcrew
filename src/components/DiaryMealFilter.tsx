import { Text, View } from "react-native";

import { AnimatedChip } from "@/components/ui/molecules/animated-chip";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { colors, fontFamily } from "@/theme";

export type MealFilter = MealSlot | "all";

/** Show one meal or all of them — five chips that each fold out into their label when picked
 * (Reacticx `animated-chip`). */
export function DiaryMealFilter({ value, onChange }: { value: MealFilter; onChange: (filter: MealFilter) => void }) {
  // Each chip's mark is the first letter of its name — set in the heading font, so it reads as part of the app.
  const options: { key: MealFilter; label: string; mark: string }[] = [{ key: "all", label: "All", mark: "ALL" }, ...MEAL_SLOTS.map((slot) => ({ key: slot.key, label: slot.label, mark: slot.label[0] }))];

  return (
    <View className="items-start">
      <AnimatedChip.Group value={value} onValueChange={(next) => onChange(next as MealFilter)}>
        {options.map((option) => (
          <AnimatedChip.Item key={option.key} value={option.key} activeColor={colors.brand.yellow} inactiveColor={colors.neutral.surface}>
            <AnimatedChip.Icon>{({ selected }) => <Text style={{ fontFamily: fontFamily.heading, fontSize: option.mark.length > 1 ? 13 : 20, letterSpacing: 0.5, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>{option.mark}</Text>}</AnimatedChip.Icon>
            <AnimatedChip.Label color={colors.brand.iron} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13 }}>
              {option.label}
            </AnimatedChip.Label>
          </AnimatedChip.Item>
        ))}
      </AnimatedChip.Group>
    </View>
  );
}
