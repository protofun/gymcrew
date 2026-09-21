import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import type { ApiFoodLog } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

type DiaryEntryRowProps = {
  entry: ApiFoodLog;
  photoUrl?: string;
  /** A meal scanned from a photo — its photo leads the row and it carries a small "AI" tag. */
  isAiMeal: boolean;
  index: number;
  isLast: boolean;
  onPress: () => void;
  onRemove: () => void;
};

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <Text className="caption text-text-secondary">{`${label} ${Math.round(value)}`}</Text>
    </View>
  );
}

/** One logged food or meal in the diary: a plain row — photo, name, macros, rolling calories — with a hairline
 * under it, not a card. Rows slide in one after the other and slide away when removed. */
export function DiaryEntryRow({ entry, photoUrl, isAiMeal, index, isLast, onPress, onRemove }: DiaryEntryRowProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(16)}
      exiting={FadeOutLeft.duration(200)}
      layout={LinearTransition.springify().damping(18)}
      className={isLast ? "" : "border-b border-divider"}
    >
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="flex-row items-center gap-3.5 py-3">
        <View>
          <FoodThumbnail photoUrl={photoUrl} icon={entry.mealId || isAiMeal ? "restaurant" : "fast-food"} color={colors.brand.yellow} size={52} />
          {isAiMeal && (
            <View style={{ position: "absolute", right: -4, bottom: -4, backgroundColor: colors.brand.yellow }} className="rounded-md px-1.5 py-0.5">
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 9, color: colors.brand.iron }}>AI</Text>
            </View>
          )}
        </View>

        <View className="flex-1 gap-1">
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.brand.white }}>
            {entry.name}
          </Text>
          <View className="flex-row items-center gap-3">
            <Macro label="P" value={entry.proteinG} color={NUTRITION_COLORS.protein} />
            <Macro label="C" value={entry.carbsG} color={NUTRITION_COLORS.carbs} />
            <Macro label="F" value={entry.fatG} color={NUTRITION_COLORS.fat} />
          </View>
        </View>

        <View className="items-end">
          <NumberFlow value={Math.round(entry.calories)} fontSize={20} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text className="caption text-text-secondary">kcal</Text>
        </View>

        <Pressable onPress={onRemove} hitSlop={10} className="pl-1" accessibilityLabel={`Remove ${entry.name}`}>
          <Ionicons name="trash-outline" size={18} color={colors.neutral.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
