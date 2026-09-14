import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import { SkewedStat } from "@/components/SkewedStat";
import { Stepper } from "@/components/Stepper";
import type { MealItem } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { scaleMacros } from "@/lib/nutrition-macros";
import { colors } from "@/theme";

type MealItemRowProps = {
  item: MealItem;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
};

/** One ingredient row in the meal/shake builder — reuses the same Stepper every set/weight input in
 * the app already uses, so quantity editing feels identical everywhere, plus a live recalculated
 * macro line underneath (see NUTRITION.md section 14/18's "live nutrition summary"). */
export function MealItemRow({ item, onChangeQuantity, onRemove }: MealItemRowProps) {
  const macros = scaleMacros(item, item.quantity);
  const isWhole = item.servingUnit === "piece";
  const step = isWhole ? 1 : 5;

  return (
    <View className="gap-2.5 rounded-2xl bg-surface p-3.5">
      <View className="flex-row items-center gap-3">
        <FoodThumbnail photoUrl={item.photoUrl} icon="fast-food" color={colors.brand.yellow} size={40} />
        <Text className="body-md font-body-semibold flex-1 text-text-primary" numberOfLines={1}>
          {item.name}
        </Text>
        <SkewedStat size={18} color={colors.neutral.textPrimary}>{`${macros.calories} kcal`}</SkewedStat>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <Stepper
        label=""
        value={item.quantity}
        onChange={onChangeQuantity}
        step={step}
        min={0}
        max={5000}
        rightAdornment={<Text className="caption text-text-secondary">{item.servingUnit}</Text>}
      />

      <View className="flex-row gap-3">
        <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.protein }}>{`${macros.proteinG}g protein`}</Text>
        <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.carbs }}>{`${macros.carbsG}g carbs`}</Text>
        <Text className="caption font-body-semibold" style={{ color: NUTRITION_COLORS.fat }}>{`${macros.fatG}g fat`}</Text>
      </View>
    </View>
  );
}
