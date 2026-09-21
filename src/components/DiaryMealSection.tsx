import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { DiaryEntryRow } from "@/components/DiaryEntryRow";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import type { ApiFoodLog } from "@/lib/api";
import { aiMealIdFromFoodId } from "@/lib/ai-meals";
import type { MealSlot } from "@/lib/meal-slot";
import { colors, fontFamily } from "@/theme";

type DiaryMealSectionProps = {
  slot: MealSlot;
  label: string;
  dateKey: string;
  entries: ApiFoodLog[];
  photoByFoodId: Record<string, string | undefined>;
  photoByMealId: Record<string, string | undefined>;
  onPressEntry: (entry: ApiFoodLog) => void;
  onRemoveEntry: (entry: ApiFoodLog) => void;
};

/** One meal of the day — a title with its icon and calories, then its entries as plain rows. */
export function DiaryMealSection({ slot, label, dateKey, entries, photoByFoodId, photoByMealId, onPressEntry, onRemoveEntry }: DiaryMealSectionProps) {
  if (entries.length === 0) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/nutrition/add", params: { date: dateKey, slot } })}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        className="flex-row items-center gap-3 rounded-2xl border border-dashed border-divider px-3 py-3"
        accessibilityLabel={`Add ${label.toLowerCase()}`}
      >
        <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: colors.neutral.divider }} />
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.8, color: colors.neutral.textSecondary }} className="flex-1">
          {label.toUpperCase()}
        </Text>
        <View style={{ backgroundColor: `${colors.brand.yellow}1F` }} className="flex-row items-center gap-1 rounded-full px-3 py-1.5">
          <Ionicons name="add" size={15} color={colors.brand.yellow} />
          <Text className="caption font-body-bold text-brand-yellow">Add</Text>
        </View>
      </Pressable>
    );
  }
  const calories = Math.round(entries.reduce((sum, entry) => sum + entry.calories, 0));

  return (
    <View>
      <View className="flex-row items-center gap-3 pb-1">
        <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: colors.brand.yellow }} />
        <View className="flex-1 flex-row items-baseline gap-2">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 0.8, color: colors.brand.white }}>{label.toUpperCase()}</Text>
          <Text className="caption text-text-secondary">{`${entries.length} ${entries.length === 1 ? "item" : "items"}`}</Text>
        </View>
        <View className="flex-row items-baseline gap-1">
          <NumberFlow value={calories} fontSize={16} color={colors.neutral.textSecondary} fontWeight="700" />
          <Text className="caption text-text-secondary">kcal</Text>
        </View>
      </View>

      {entries.map((entry, index) => (
        <DiaryEntryRow
          key={entry.id}
          entry={entry}
          photoUrl={entry.mealId ? photoByMealId[entry.mealId] : entry.foodId ? photoByFoodId[entry.foodId] : undefined}
          isAiMeal={aiMealIdFromFoodId(entry.foodId) !== null}
          index={index}
          isLast={index === entries.length - 1}
          onPress={() => onPressEntry(entry)}
          onRemove={() => onRemoveEntry(entry)}
        />
      ))}
    </View>
  );
}
