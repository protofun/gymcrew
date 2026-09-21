import { Ionicons } from "@expo/vector-icons";

import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { colors, fontFamily } from "@/theme";

export const MEAL_SLOT_ICONS: Record<MealSlot, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snacks: "cafe-outline",
};

type AiScanMealFanProps = {
  mealSlot: MealSlot;
  onChange: (slot: MealSlot) => void;
  /** Distance from the bottom of the screen — the fan sits in the bottom bar, so this clears the safe area. */
  bottom: number;
  buttonSize: number;
};

/** "Log it as" — a round button showing the chosen meal that fans out into Breakfast / Lunch / Dinner /
 * Snacks (Reacticx `fan-menu`). It positions itself against the screen, so render it as a direct
 * child of the full-screen container, not inside a bar. */
export function AiScanMealFan({ mealSlot, onChange, bottom, buttonSize }: AiScanMealFanProps) {
  return (
    <FanMenu position="bottom-left" offset={{ vertical: bottom, horizontal: 20 }} buttonSize={buttonSize} direction="up" itemDirection="right" spacing={62} spread={3}>
      <FanMenu.Trigger style={{ backgroundColor: AI_SCAN.surfaceRaised, borderWidth: 1, borderColor: AI_SCAN.border }}>
        <Ionicons name={MEAL_SLOT_ICONS[mealSlot]} size={22} color={AI_SCAN.accent} />
      </FanMenu.Trigger>
      {MEAL_SLOTS.map((slot) => {
        const selected = slot.key === mealSlot;
        return (
          <FanMenu.Item
            key={slot.key}
            value={slot.key}
            onPress={() => onChange(slot.key)}
            style={{ backgroundColor: AI_SCAN.surfaceRaised, borderWidth: 1, borderColor: selected ? AI_SCAN.accent : AI_SCAN.border }}
          >
            <FanMenu.Icon>
              <Ionicons name={MEAL_SLOT_ICONS[slot.key]} size={18} color={selected ? AI_SCAN.accent : colors.brand.white} />
            </FanMenu.Icon>
            <FanMenu.Label style={{ color: selected ? AI_SCAN.accent : colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 14 }}>{slot.label}</FanMenu.Label>
          </FanMenu.Item>
        );
      })}
    </FanMenu>
  );
}
