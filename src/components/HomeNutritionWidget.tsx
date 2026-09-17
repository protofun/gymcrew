import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { GoalRing } from "@/components/GoalRing";
import { SkewedStat } from "@/components/SkewedStat";
import { toDateKey } from "@/lib/date";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { sumMacros } from "@/lib/nutrition-macros";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { colors } from "@/theme";

const RING_SIZE = 68;

/** Compact "Today's Fuel" card for Home (see NUTRITION.md section 29) — a calorie ring (same hero
 * language as the Nutrition dashboard, just small) plus a protein readout and macro chips, never
 * the full dashboard. Renders nothing until real targets exist, same "don't show half-real numbers"
 * rule the rest of Home follows (see home.tsx's sync gate). */
export function HomeNutritionWidget() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const entries = useNutritionLogStore((state) => state.entries);
  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinTarget = useNutritionTargetsStore((state) => state.proteinG);
  const carbsTarget = useNutritionTargetsStore((state) => state.carbsG);
  const fatTarget = useNutritionTargetsStore((state) => state.fatG);

  const todayTotals = useMemo(
    () => sumMacros(entries.filter((entry) => entry.dateKey === todayKey)),
    [entries, todayKey],
  );

  if (calories === null || proteinTarget === null || carbsTarget === null || fatTarget === null) return null;

  const calorieRatio = calories > 0 ? todayTotals.calories / calories : 0;
  const proteinRatio = proteinTarget > 0 ? todayTotals.proteinG / proteinTarget : 0;
  const remaining = Math.max(0, Math.round(calories - todayTotals.calories));

  return (
    <Card onPress={() => router.push("/nutrition")} className="mx-4 mt-8">
      <View className="flex-row items-center gap-4 p-4">
        <GoalRing ratio={calorieRatio} color={NUTRITION_COLORS.calories} size={RING_SIZE} strokeWidth={7}>
          <Ionicons name="flame" size={22} color={NUTRITION_COLORS.calories} />
        </GoalRing>

        <View className="flex-1 gap-1.5">
          <Text className="caption font-body-bold text-text-secondary">TODAY&apos;S FUEL</Text>
          <View className="flex-row items-baseline gap-1">
            <SkewedStat id="home.nutrition.calories" size={26} color={colors.neutral.textPrimary}>
              {String(Math.round(todayTotals.calories))}
            </SkewedStat>
            <Text className="caption text-text-secondary">{`/ ${calories} kcal · ${remaining} left`}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="barbell-outline" size={12} color={NUTRITION_COLORS.protein} />
            <Text className="caption font-body-semibold text-text-secondary">{`${todayTotals.proteinG}g / ${proteinTarget}g protein`}</Text>
            {proteinRatio >= 1 && <Ionicons name="checkmark-circle" size={13} color={NUTRITION_COLORS.protein} />}
          </View>
        </View>

        <Pressable onPress={() => router.push("/nutrition/add")} hitSlop={8} className="items-center gap-1">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-yellow">
            <Ionicons name="add" size={18} color={colors.brand.iron} />
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}
