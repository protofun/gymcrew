import { Image, View } from "react-native";

import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { nutritionIcons } from "@/constants/images";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { colors, fontFamily } from "@/theme";

type MealSlotFanProps = {
  mealSlot: MealSlot;
  onChange: (slot: MealSlot) => void;
  /** Distance from the bottom of the screen — the fan sits in the bottom bar, so this clears the safe area. */
  bottom: number;
  buttonSize: number;
};

/** "Log it as" (the AI scan, food details, quick add) — a round button with the app's bowl on it that fans out
 * into Breakfast / Lunch / Dinner / Snacks (Reacticx `fan-menu`); the chosen meal is marked with a yellow dot.
 * It positions itself against the screen, so render it as a direct child of the full-screen container, not inside a bar. */
export function MealSlotFan({ mealSlot, onChange, bottom, buttonSize }: MealSlotFanProps) {
  return (
    <FanMenu position="bottom-left" offset={{ vertical: bottom, horizontal: 20 }} buttonSize={buttonSize} direction="up" itemDirection="right" spacing={62} spread={3}>
      <FanMenu.Trigger style={{ backgroundColor: AI_SCAN.surfaceRaised, borderWidth: 1, borderColor: AI_SCAN.border }}>
        <Image source={nutritionIcons.myFoods} resizeMode="contain" style={{ width: buttonSize * 0.6, height: buttonSize * 0.6 }} />
      </FanMenu.Trigger>
      {MEAL_SLOTS.map((slot) => {
        const selected = slot.key === mealSlot;
        return (
          <FanMenu.Item
            key={slot.key}
            value={slot.key}
            onPress={() => onChange(slot.key)}
            style={{ backgroundColor: AI_SCAN.surfaceRaised, borderWidth: 1, borderColor: selected ? AI_SCAN.accent : AI_SCAN.border, paddingHorizontal: 16, paddingVertical: 9 }}
          >
            <View className="flex-row items-center gap-2">
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: selected ? AI_SCAN.accent : "transparent" }} />
              <FanMenu.Label style={{ color: selected ? AI_SCAN.accent : colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 14 }}>{slot.label}</FanMenu.Label>
            </View>
          </FanMenu.Item>
        );
      })}
    </FanMenu>
  );
}
