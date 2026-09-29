import { Ionicons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { nutritionIcons } from "@/constants/images";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { fontFamily } from "@/theme";

const SLOT_ICON: Record<MealSlot, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  dinner: "moon",
  snacks: "fast-food",
};

type MealSlotFanProps = {
  mealSlot: MealSlot;
  onChange: (slot: MealSlot) => void;
  /** Distance from the bottom of the screen — the fan sits in the bottom bar, so this clears the safe area. */
  bottom: number;
  buttonSize: number;
};

const ITEM_SIZE = 60;

/** "Log it as" (the AI scan, food details, quick add) — a round button with the app's bowl on it that fans out
 * into Breakfast / Lunch / Dinner / Snacks (Reacticx `fan-menu`). Same item shape as `TabBarFan`'s own "+" now
 * — small round icon circles with a label underneath, not the wide text pills this used to be: four things
 * you tap once, not four things you read. The picked slot fills solid yellow, same "selected = filled, not
 * just outlined" language `TabBarFan`'s own items don't need (nothing there is ever "selected") but every
 * other picker in the app does.
 *
 * Anchored bottom-left, not bottom-center like `TabBarFan`/`NutritionAddFan` — the bottom bar's other
 * controls live to the right of it — which rules out `TabBarFan`'s own `layout="arc"`: an arc always spreads
 * symmetrically around `direction` (`itemDirection` only ever affects tilt, never the centering — see
 * `computeItemGeometry`), so from a corner anchor its leftmost item swings straight past the screen edge no
 * matter how small `spread` gets, since it's the constant `spacing` radius doing that, not the angle
 * (confirmed via Playwright — Breakfast rendered half off-screen at `spread=26`/`spacing=100`). `layout="cascade"`
 * with `itemDirection="right"` instead — the one-directional walk this already used for its old wide pills,
 * `spacing` just tuned back down for these much narrower 60px icon items (see AGENTS.md's fan-menu note on
 * tuning by screenshot, not by feel). */
export function MealSlotFan({ mealSlot, onChange, bottom, buttonSize }: MealSlotFanProps) {
  return (
    <FanMenu position="bottom-left" offset={{ vertical: bottom, horizontal: 20 }} buttonSize={buttonSize} direction="up" itemDirection="right" layout="cascade" spread={20} spacing={68} tilt={0} stagger={40}>
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
            style={{ width: ITEM_SIZE, flexDirection: "column", backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0, gap: 5, shadowOpacity: 0, elevation: 0 }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? AI_SCAN.accent : AI_SCAN.surfaceRaised,
                borderWidth: 1,
                borderColor: selected ? AI_SCAN.accent : AI_SCAN.border,
              }}
            >
              <Ionicons name={SLOT_ICON[slot.key]} size={20} color={selected ? AI_SCAN.onAccent : AI_SCAN.accent} />
            </View>
            <FanMenu.Label
              style={{ color: selected ? AI_SCAN.accent : AI_SCAN.textMuted, fontFamily: fontFamily.bodySemiBold, fontSize: 10.5, textAlign: "center", width: ITEM_SIZE }}
            >
              {slot.label}
            </FanMenu.Label>
          </FanMenu.Item>
        );
      })}
    </FanMenu>
  );
}
