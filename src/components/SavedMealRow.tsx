import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { nutritionIcons } from "@/constants/images";
import type { ApiMeal } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

type SavedMealRowProps = {
  meal: ApiMeal;
  index: number;
  isLast: boolean;
  /** Opens the meal (change amounts, then add). */
  onPress: () => void;
  /** Logs it to today as saved, one tap. */
  onQuickAdd: () => void;
  /** Leave out to hide the trash can. */
  onDelete?: () => void;
};

/** A saved shake or meal as a plain row — icon, name, macros, calories — with a round "+" that logs it to
 * today in one tap (it turns into a check for a moment) and a trash can. Tap the row to adjust amounts first. */
export function SavedMealRow({ meal, index, isLast, onPress, onQuickAdd, onDelete }: SavedMealRowProps) {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleQuickAdd() {
    if (added) return;
    onQuickAdd();
    setAdded(true);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  const isShake = meal.kind === "shake";
  const accent = isShake ? NUTRITION_COLORS.fat : colors.brand.yellow;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16)} exiting={FadeOutLeft.duration(200)} layout={LinearTransition.springify().damping(18)} className={isLast ? "" : "border-b border-divider"}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="flex-row items-center gap-3.5 py-3">
        <View style={{ backgroundColor: `${accent}1F` }} className="h-[52px] w-[52px] items-center justify-center rounded-[18px]">
          <Image source={isShake ? nutritionIcons.protein : nutritionIcons.myMeals} resizeMode="contain" style={{ width: 36, height: 36 }} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.brand.white }}>
            {meal.name}
          </Text>
          <Text numberOfLines={1} className="caption text-text-secondary">{`${meal.items.length} ${meal.items.length === 1 ? "ingredient" : "ingredients"} · ${Math.round(meal.totalProteinG)}g protein`}</Text>
        </View>
        <View className="items-end">
          <NumberFlow value={Math.round(meal.totalCalories)} fontSize={18} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text className="caption text-text-secondary">kcal</Text>
        </View>
        <Pressable
          onPress={handleQuickAdd}
          hitSlop={8}
          style={{ backgroundColor: added ? "transparent" : colors.brand.yellow }}
          className="h-9 w-9 items-center justify-center rounded-full"
          accessibilityLabel={`Add ${meal.name} to today`}
        >
          <Ionicons name={added ? "checkmark-circle" : "add"} size={added ? 26 : 22} color={added ? colors.brand.yellow : colors.brand.iron} />
        </Pressable>
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Delete ${meal.name}`}>
            <Ionicons name="trash-outline" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}
