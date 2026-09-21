import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AiScanMacroRing } from "@/components/AiScanMacroRing";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import type { Macros } from "@/lib/nutrition-macros";
import { colors } from "@/theme";

/** The totals of a shake or meal being built (or looked at): calories as one big rolling number, and a ring per macro
 * with its share of the calories. Everything moves as ingredients are added, removed or resized. */
export function MealTotalsHero({ totals }: { totals: Macros }) {
  const kcal = { protein: totals.proteinG * 4, carbs: totals.carbsG * 4, fat: totals.fatG * 9 };
  const kcalSum = kcal.protein + kcal.carbs + kcal.fat;
  const percentOf = (value: number) => (kcalSum > 0 ? (value / kcalSum) * 100 : 0);

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} className="gap-5 border-y border-divider py-5">
      <View className="flex-row items-baseline justify-center gap-2">
        <NumberFlow value={totals.calories} fontSize={54} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
        <Text className="body-md font-body-bold" style={{ color: NUTRITION_COLORS.calories }}>
          kcal
        </Text>
      </View>
      <View className="flex-row justify-around">
        <AiScanMacroRing label="PROTEIN" grams={totals.proteinG} kcal={kcal.protein} percent={percentOf(kcal.protein)} color={NUTRITION_COLORS.protein} />
        <AiScanMacroRing label="CARBS" grams={totals.carbsG} kcal={kcal.carbs} percent={percentOf(kcal.carbs)} color={NUTRITION_COLORS.carbs} />
        <AiScanMacroRing label="FAT" grams={totals.fatG} kcal={kcal.fat} percent={percentOf(kcal.fat)} color={NUTRITION_COLORS.fat} />
      </View>
    </Animated.View>
  );
}
