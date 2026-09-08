import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MacroTotalsBar } from "@/components/MacroTotalsBar";
import { MealItemRow } from "@/components/MealItemRow";
import type { MealItem } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { mealSlotForTime } from "@/lib/meal-slot";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors } from "@/theme";

/** Saved meal/shake detail — adjust quantities for today, then add. Editing a quantity here never
 * silently rewrites the saved recipe (see NUTRITION.md section 16): only "Update Saved Meal" does
 * that, "Use Once" logs the adjusted amounts without touching the original. */
export default function MealDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const meals = useNutritionMealsStore((state) => state.meals);
  const saveMeal = useNutritionMealsStore((state) => state.saveMeal);
  const removeMeal = useNutritionMealsStore((state) => state.removeMeal);
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const meal = useMemo(() => meals.find((m) => m.id === id), [meals, id]);
  const [items, setItems] = useState<MealItem[]>(meal?.items ?? []);

  const totals = useMemo(() => sumMacros(items.map((item) => scaleMacros(item, item.quantity))), [items]);
  const isModified = useMemo(
    () => meal !== undefined && (items.length !== meal.items.length || items.some((item, i) => item.quantity !== meal.items[i]?.quantity)),
    [items, meal],
  );

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/my-meals");
  }

  function logToday(loggedItems: MealItem[]) {
    if (!meal) return;
    const loggedTotals = sumMacros(loggedItems.map((item) => scaleMacros(item, item.quantity)));
    addEntry({
      foodId: null,
      mealId: meal.id,
      name: meal.name,
      mealSlot: mealSlotForTime(),
      quantity: 1,
      unit: "serving",
      calories: loggedTotals.calories,
      proteinG: loggedTotals.proteinG,
      carbsG: loggedTotals.carbsG,
      fatG: loggedTotals.fatG,
      dateKey: toDateKey(new Date()),
    });
    router.replace("/nutrition");
  }

  function handleAdd() {
    if (!meal) return;
    if (!isModified) {
      logToday(items);
      return;
    }
    Alert.alert("Add to Today's Log", "You've changed the amounts. Use them just for today, or update the saved recipe too?", [
      { text: "Cancel", style: "cancel" },
      { text: "Use Once", onPress: () => logToday(items) },
      {
        text: "Update Saved Meal",
        onPress: () => {
          const updatedTotals = sumMacros(items.map((item) => scaleMacros(item, item.quantity)));
          saveMeal({ id: meal.id, kind: meal.kind, name: meal.name, description: meal.description, items, totalCalories: updatedTotals.calories, totalProteinG: updatedTotals.proteinG, totalCarbsG: updatedTotals.carbsG, totalFatG: updatedTotals.fatG });
          logToday(items);
        },
      },
    ]);
  }

  function handleDelete() {
    if (!meal) return;
    Alert.alert(`Delete ${meal.kind === "shake" ? "Shake" : "Meal"}`, `Remove "${meal.name}" for good?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { removeMeal(meal.id); router.replace("/nutrition/my-meals"); } },
    ]);
  }

  if (!meal) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">This meal couldn&apos;t be found.</Text>
        <Pressable onPress={handleBack} className="mt-4 rounded-full border border-divider px-5 py-2.5">
          <Text className="body-sm font-body-semibold text-text-primary">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{meal.name}</Text>
        <View className="flex-row items-center gap-4" style={{ position: "absolute", right: 16 }}>
          <Pressable onPress={() => router.push({ pathname: "/nutrition/meal-builder", params: { id: meal.id, kind: meal.kind } })} hitSlop={8}>
            <Ionicons name="create-outline" size={22} color={colors.neutral.textSecondary} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => (
          <MealItemRow
            key={`${item.id}-${index}`}
            item={item}
            onChangeQuantity={(quantity) => setItems((current) => current.map((it, i) => (i === index ? { ...it, quantity } : it)))}
            onRemove={() => setItems((current) => current.filter((_, i) => i !== index))}
          />
        ))}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-3 border-t border-divider bg-surface px-4 pt-3">
        <MacroTotalsBar totals={totals} />
        <Pressable onPress={handleAdd} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Add to Today&apos;s Log</Text>
        </Pressable>
      </View>
    </View>
  );
}
