import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconBadge } from "@/components/IconBadge";
import { SkewedStat } from "@/components/SkewedStat";
import type { ApiMeal, MealKind } from "@/lib/api";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors } from "@/theme";

const TABS: { key: MealKind; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "meal", label: "Meals", icon: "restaurant-outline", color: colors.brand.yellow },
  { key: "shake", label: "Shakes", icon: "nutrition-outline", color: NUTRITION_COLORS.fat },
];

function MealRow({ meal, accent, onPress, onDelete }: { meal: ApiMeal; accent: string; onPress: () => void; onDelete: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface">
      <View style={{ width: 4, backgroundColor: accent }} />
      <View className="flex-1 flex-row items-center gap-3 px-3.5 py-3">
        <IconBadge icon={meal.kind === "shake" ? "nutrition-outline" : "restaurant-outline"} color={accent} size={36} />
        <View className="flex-1 gap-0.5">
          <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>{meal.name}</Text>
          <Text className="caption text-text-secondary">{`${meal.totalProteinG}g protein · ${meal.totalCarbsG}g carbs · ${meal.totalFatG}g fat`}</Text>
        </View>
        <SkewedStat size={20} color={colors.neutral.textPrimary}>{String(Math.round(meal.totalCalories))}</SkewedStat>
        <Pressable onPress={onDelete} hitSlop={8} className="h-9 w-9 items-center justify-center">
          <Ionicons name="trash-outline" size={17} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function MyMealsScreen() {
  const insets = useSafeAreaInsets();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: MealKind }>();
  const [tab, setTab] = useState<MealKind>(tabParam === "shake" ? "shake" : "meal");

  const meals = useNutritionMealsStore((state) => state.meals);
  const removeMeal = useNutritionMealsStore((state) => state.removeMeal);

  const visibleMeals = useMemo(() => meals.filter((meal) => meal.kind === tab), [meals, tab]);
  const activeTab = TABS.find((option) => option.key === tab)!;

  function handleDelete(meal: ApiMeal) {
    Alert.alert(`Delete ${meal.kind === "shake" ? "Shake" : "Meal"}`, `Remove "${meal.name}" from ${activeTab.label}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeMeal(meal.id) },
    ]);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">My {activeTab.label}</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/nutrition/meal-builder", params: { kind: tab } })}
          hitSlop={8}
          style={{ position: "absolute", right: 16 }}
        >
          <Ionicons name="add-circle" size={26} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <View className="flex-row gap-2 p-4 pb-0">
        {TABS.map((option) => {
          const active = option.key === tab;
          return (
            <Pressable
              key={option.key}
              onPress={() => setTab(option.key)}
              style={{ borderColor: active ? option.color : colors.neutral.divider, backgroundColor: active ? option.color : colors.neutral.surface }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border py-2.5"
            >
              <Ionicons name={option.icon} size={15} color={active ? colors.brand.iron : colors.neutral.textSecondary} />
              <Text className="body-sm font-body-semibold" style={{ color: active ? colors.brand.iron : colors.neutral.textSecondary }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }} showsVerticalScrollIndicator={false}>
        {visibleMeals.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name={activeTab.icon} size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No {activeTab.label.toLowerCase()} saved yet.</Text>
            <Text className="body-sm text-text-secondary">Tap + to build one.</Text>
          </View>
        ) : (
          visibleMeals.map((meal) => (
            <MealRow
              key={meal.id}
              meal={meal}
              accent={activeTab.color}
              onPress={() => router.push({ pathname: "/nutrition/meal/[id]", params: { id: meal.id } })}
              onDelete={() => handleDelete(meal)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
