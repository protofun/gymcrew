import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { SkewedStat } from "@/components/SkewedStat";
import type { ApiFoodLog } from "@/lib/api";
import { colors } from "@/theme";

type FoodLogRowProps = {
  entry: ApiFoodLog;
  onPress: () => void;
  onRemove: () => void;
};

/** One collapsed row in Today's Food (see NUTRITION.md section 3) — same accent-bar-card language
 * as profile/body-log.tsx's entry rows: a big stat column on the LEFT (calories, not buried in a
 * caption), a divider, then the name/macros. */
export function FoodLogRow({ entry, onPress, onRemove }: FoodLogRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface"
    >
      <View style={{ width: 4, backgroundColor: colors.brand.yellow }} />

      <View className="items-center justify-center gap-0.5 px-4 py-3">
        <SkewedStat id={`nutrition.foodLog.${entry.id}.calories`} size={22} color={colors.brand.white}>
          {String(Math.round(entry.calories))}
        </SkewedStat>
        <Text className="caption font-body-semibold text-text-secondary">KCAL</Text>
      </View>

      <View className="flex-1 flex-row items-center gap-2 border-l border-divider py-3 pl-3 pr-2">
        {entry.mealId && <Ionicons name="restaurant" size={14} color={colors.neutral.textSecondary} />}
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="body-md font-body-semibold text-text-primary">
            {entry.name}
          </Text>
          <Text className="caption text-text-secondary">{`${entry.proteinG}g protein · ${entry.carbsG}g carbs · ${entry.fatG}g fat`}</Text>
        </View>
      </View>

      <Pressable onPress={onRemove} hitSlop={8} className="items-center justify-center pl-2 pr-3">
        <Ionicons name="trash-outline" size={16} color={colors.neutral.textSecondary} />
      </Pressable>
    </Pressable>
  );
}
