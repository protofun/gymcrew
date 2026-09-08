import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { SkewedStat } from "@/components/SkewedStat";
import type { Macros } from "@/lib/nutrition-macros";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors } from "@/theme";

/** The live totals readout shared by the meal builder and meal detail screens — a big skewed
 * calorie stat plus a color-coded protein/carbs/fat chip row, so a saved meal's nutrition is
 * scannable at a glance instead of one long caption line. */
export function MacroTotalsBar({ totals }: { totals: Macros }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="flame" size={16} color={NUTRITION_COLORS.calories} />
        <SkewedStat size={22} color={colors.neutral.textPrimary}>{`${totals.calories} kcal`}</SkewedStat>
      </View>
      <View className="flex-row gap-2.5">
        <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.protein }}>{`${totals.proteinG}g P`}</Text>
        <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.carbs }}>{`${totals.carbsG}g C`}</Text>
        <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.fat }}>{`${totals.fatG}g F`}</Text>
      </View>
    </View>
  );
}
