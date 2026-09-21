import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MealSlotFan } from "@/components/MealSlotFan";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_SAVE_BUTTON_COLORS } from "@/constants/ai-scan-theme";
import { MEAL_SLOTS, type MealSlot } from "@/lib/meal-slot";
import { colors, fontFamily } from "@/theme";

const BUTTON_SIZE = 52;

type MealActionBarProps = {
  mealSlot: MealSlot;
  onChangeMealSlot: (slot: MealSlot) => void;
  /** Where it will be logged, e.g. "Add to Lunch". */
  actionLabel: string;
  saveLabel: string;
  savedLabel: string;
  disabled?: boolean;
  /** Writes the entry — the Save button then plays its animation. */
  onSave: () => void;
  /** Called when that animation is done; usually leaves the screen. */
  onSaved: () => void;
};

/** The bar at the bottom of the "add this" screens: the meal fan on the left (pick Breakfast / Lunch / ...),
 * where it goes in the middle, and the animated Save button. It renders the bar and the fan as two absolute
 * siblings, so it has to be a direct child of the full-screen container. */
export function MealActionBar({ mealSlot, onChangeMealSlot, actionLabel, saveLabel, savedLabel, disabled, onSave, onSaved }: MealActionBarProps) {
  const insets = useSafeAreaInsets();
  const slotLabel = MEAL_SLOTS.find((slot) => slot.key === mealSlot)?.label ?? "";

  return (
    <>
      <Animated.View
        entering={FadeInUp.delay(250).springify()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 12, backgroundColor: colors.neutral.background }}
        className="flex-row items-center gap-3.5 border-t border-divider px-5 pt-3"
      >
        <View style={{ width: BUTTON_SIZE }} />
        <View className="flex-1 flex-row items-center gap-2">
          <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.neutral.textSecondary} />
          <AnimatedText
            text={`${actionLabel.toUpperCase()} ${slotLabel.toUpperCase()}`}
            animationConfig={{ characterDelay: 12 }}
            enterFrom={{ translateY: 14, scale: 0.5 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 1, color: colors.brand.white }}
          />
        </View>
        <SaveButton.Root onSave={onSave} onSaved={onSaved} disabled={disabled} colors={AI_SAVE_BUTTON_COLORS} minLoading={350} successPause={250}>
          <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>{saveLabel}</SaveButton.Label>
          <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>{savedLabel}</SaveButton.Saved>
        </SaveButton.Root>
      </Animated.View>

      <MealSlotFan mealSlot={mealSlot} onChange={onChangeMealSlot} bottom={insets.bottom + 12} buttonSize={BUTTON_SIZE} />
    </>
  );
}

export const MEAL_ACTION_BAR_HEIGHT = 96;
