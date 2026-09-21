import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors } from "@/theme";

type AiScanDayLineProps = {
  /** Calories in this meal. */
  mealCalories: number;
  /** Calories logged for the whole day — this meal is already in there. */
  dayCalories: number;
  targetCalories: number;
};

/** One slim line about how the meal sits in the day — how much of it is used up, and what's left —
 * instead of a second card repeating numbers that are already on screen. */
export function AiScanDayLine({ mealCalories, dayCalories, targetCalories }: AiScanDayLineProps) {
  const left = targetCalories - dayCalories;
  const mealShare = Math.round((mealCalories / targetCalories) * 100);

  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="caption font-body-bold" style={{ color: AI_SCAN.textMuted, letterSpacing: 1.2 }}>
          {`THIS MEAL · ${mealShare}% OF YOUR DAY`}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <NumberFlow value={Math.abs(Math.round(left))} fontSize={14} color={left >= 0 ? colors.brand.white : colors.semantic.warning} fontWeight="800" />
          <Text className="caption font-body-semibold" style={{ color: left >= 0 ? AI_SCAN.textMuted : colors.semantic.warning }}>
            {left >= 0 ? "kcal left" : "kcal over"}
          </Text>
        </View>
      </View>
      <AnimatedProgressBar progress={dayCalories / targetCalories} height={6} borderRadius={3} progressColor={AI_SCAN.accent} trackColor={AI_SCAN.border} />
    </Animated.View>
  );
}
