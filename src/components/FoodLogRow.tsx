import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import { SkewedStat } from "@/components/SkewedStat";
import type { ApiFoodLog } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors } from "@/theme";

type FoodLogRowProps = {
  entry: ApiFoodLog;
  photoUrl?: string;
  onPress: () => void;
  onRemove: () => void;
};

/** One collapsed row in Today's Food (see NUTRITION.md section 3) — a real food photo leads the
 * row (falls back to a tinted icon tile when none exists), same "food is visual, not a spreadsheet
 * row" language as the search results and the food picker. */
export function FoodLogRow({ entry, photoUrl, onPress, onRemove }: FoodLogRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className="flex-row items-center gap-3 rounded-2xl bg-surface p-2.5"
    >
      <FoodThumbnail photoUrl={photoUrl} icon={entry.mealId ? "restaurant" : "fast-food"} color={colors.brand.yellow} size={52} />

      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="body-md font-body-semibold text-text-primary">
          {entry.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.protein }}>{`${entry.proteinG}g P`}</Text>
          <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.carbs }}>{`${entry.carbsG}g C`}</Text>
          <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.fat }}>{`${entry.fatG}g F`}</Text>
        </View>
      </View>

      <View className="items-end">
        <SkewedStat id={`nutrition.foodLog.${entry.id}.calories`} size={20} color={colors.neutral.textPrimary}>
          {String(Math.round(entry.calories))}
        </SkewedStat>
        <Text className="caption -mt-0.5 text-text-secondary">kcal</Text>
      </View>

      <Pressable onPress={onRemove} hitSlop={8} className="items-center justify-center pl-1">
        <Ionicons name="close-circle" size={18} color={colors.neutral.textSecondary} />
      </Pressable>
    </Pressable>
  );
}
