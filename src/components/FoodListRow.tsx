import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import type { Food } from "@/data/nutrition-foods";
import { colors, fontFamily } from "@/theme";

type FoodListRowProps = {
  food: Food;
  onPress: () => void;
  isLast?: boolean;
  /** Replaces the chevron, e.g. a trash can on My Foods. */
  trailing?: ReactNode;
};

/** A food in a list — photo, name and brand, what a serving is, and its calories — as a plain row with a
 * hairline under it. Used for search results, favorites and My Foods. */
export function FoodListRow({ food, onPress, isLast, trailing }: FoodListRowProps) {
  const isOff = food.source === "open_food_facts";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className={`flex-row items-center gap-3.5 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <FoodThumbnail photoUrl={food.photoUrl} icon={isOff ? "globe-outline" : "fast-food"} color={isOff ? colors.semantic.info : colors.brand.yellow} size={52} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.brand.white }}>
          {food.name}
        </Text>
        <Text numberOfLines={1} className="caption text-text-secondary">
          {[food.brand, `${Math.round(food.proteinG)}g protein / ${food.servingSize}${food.servingUnit}`].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View className="items-end">
        <NumberFlow value={Math.round(food.calories)} fontSize={18} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
        <Text className="caption text-text-secondary">kcal</Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={15} color={colors.neutral.textSecondary} />}
    </Pressable>
  );
}
