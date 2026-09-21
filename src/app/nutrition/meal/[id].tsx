import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { ConfirmModal } from "@/components/ConfirmModal";
import { IngredientRow } from "@/components/IngredientRow";
import { MealActionBar } from "@/components/MealActionBar";
import { MealTotalsHero } from "@/components/MealTotalsHero";
import { HeaderRoundButton, NutritionPageHeader } from "@/components/NutritionPageHeader";
import { AnimatedChip } from "@/components/ui/molecules/animated-chip";
import { Accordion } from "@/components/ui/molecules/accordion";
import { AI_ACCORDION_THEME } from "@/constants/ai-scan-theme";
import type { MealItem } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { goToNutrition } from "@/lib/nutrition-nav";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors, fontFamily } from "@/theme";

type SaveMode = "once" | "update";

/** Saved meal/shake detail — adjust quantities for today, then add. Editing a quantity here never silently
 * rewrites the saved recipe (see NUTRITION.md section 16): once you've changed something you choose between
 * "just today" and "update the recipe" before adding — no pop-up, both are right there next to the amounts. */
export default function MealDetailScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { id, date, slot } = useLocalSearchParams<{ id: string; date?: string; slot?: string }>();
  const targetDateKey = date ?? toDateKey(new Date());

  const meals = useNutritionMealsStore((state) => state.meals);
  const saveMeal = useNutritionMealsStore((state) => state.saveMeal);
  const removeMeal = useNutritionMealsStore((state) => state.removeMeal);
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const meal = useMemo(() => meals.find((m) => m.id === id), [meals, id]);
  const [items, setItems] = useState<MealItem[]>(meal?.items ?? []);
  const [saveMode, setSaveMode] = useState<SaveMode>("once");
  const [mealSlot, setMealSlot] = useState<MealSlot>(MEAL_SLOTS.find((option) => option.key === slot)?.key ?? mealSlotForTime());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totals = useMemo(() => sumMacros(items.map((item) => scaleMacros(item, item.quantity))), [items]);
  const isModified = useMemo(
    () => meal !== undefined && (items.length !== meal.items.length || items.some((item, i) => item.quantity !== meal.items[i]?.quantity)),
    [items, meal],
  );

  function handleBack() {
    if (router.canGoBack()) router.back();
    else goToNutrition("foods", { tab: meal?.kind ?? "meal" });
  }

  /** Logs the meal to the chosen day as it is now — and, when asked to, updates the saved recipe with it. */
  function commitAdd() {
    if (!meal) return;
    if (isModified && saveMode === "update") {
      saveMeal({ id: meal.id, kind: meal.kind, name: meal.name, description: meal.description, items, totalCalories: totals.calories, totalProteinG: totals.proteinG, totalCarbsG: totals.carbsG, totalFatG: totals.fatG });
      posthog.capture("meal_updated", { kind: meal.kind, ingredient_count: items.length, calories: totals.calories });
    }
    addEntry({
      foodId: null,
      mealId: meal.id,
      name: meal.name,
      mealSlot,
      quantity: 1,
      unit: "serving",
      calories: totals.calories,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      dateKey: targetDateKey,
    });
    posthog.capture("meal_logged", { kind: meal.kind, meal_id: meal.id, calories: totals.calories, modified: isModified });
  }

  function handleDelete() {
    if (!meal) return;
    setConfirmDelete(false);
    removeMeal(meal.id);
    posthog.capture("meal_deleted", { kind: meal.kind });
    goToNutrition("foods", { tab: meal.kind });
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

  const label = meal.kind === "shake" ? "shake" : "meal";

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <NutritionPageHeader
          title={meal.name}
          subtitle={`${items.length} ${items.length === 1 ? "ingredient" : "ingredients"} — change an amount to log a bigger or smaller one.`}
          onBack={handleBack}
          actions={
            <>
              <HeaderRoundButton icon="create-outline" label={`Edit ${label}`} onPress={() => router.push({ pathname: "/nutrition/meal-builder", params: { id: meal.id, kind: meal.kind } })} />
              <HeaderRoundButton icon="trash-outline" label={`Delete ${label}`} onPress={() => setConfirmDelete(true)} />
            </>
          }
        />

        <View className="gap-7 px-5 pt-2">
          <MealTotalsHero totals={totals} />

          <Animated.View layout={LinearTransition.springify().damping(18)}>
            <Accordion type="single" flush theme={AI_ACCORDION_THEME}>
              {items.map((item, index) => (
                <IngredientRow
                  key={`${item.id}#${index}`}
                  item={{ ...item, id: `${item.id}#${index}` }}
                  onChangeQuantity={(quantity) => setItems((current) => current.map((it, i) => (i === index ? { ...it, quantity } : it)))}
                  onRemove={() => setItems((current) => current.filter((_, i) => i !== index))}
                />
              ))}
            </Accordion>
          </Animated.View>

          {isModified && (
            <Animated.View entering={FadeInDown.springify().damping(16)} className="gap-2.5">
              <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
                YOU CHANGED THE AMOUNTS — USE THEM…
              </Text>
              <View className="items-start">
                <AnimatedChip.Group value={saveMode} onValueChange={(next) => setSaveMode(next as SaveMode)}>
                  <AnimatedChip.Item value="once" activeColor={colors.brand.yellow} inactiveColor={colors.neutral.surface}>
                    <AnimatedChip.Icon>{({ selected }) => <Text style={{ fontFamily: fontFamily.heading, fontSize: 18, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>1×</Text>}</AnimatedChip.Icon>
                    <AnimatedChip.Label color={colors.brand.iron} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13 }}>
                      Just today
                    </AnimatedChip.Label>
                  </AnimatedChip.Item>
                  <AnimatedChip.Item value="update" activeColor={colors.brand.yellow} inactiveColor={colors.neutral.surface}>
                    <AnimatedChip.Icon>{({ selected }) => <Text style={{ fontFamily: fontFamily.heading, fontSize: 18, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>=</Text>}</AnimatedChip.Icon>
                    <AnimatedChip.Label color={colors.brand.iron} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13 }}>
                      Update the {label}
                    </AnimatedChip.Label>
                  </AnimatedChip.Item>
                </AnimatedChip.Group>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <MealActionBar mealSlot={mealSlot} onChangeMealSlot={setMealSlot} actionLabel="Add to" saveLabel="Add" savedLabel="Added" disabled={items.length === 0} onSave={commitAdd} onSaved={() => goToNutrition()} />

      <ConfirmModal
        visible={confirmDelete}
        title={`Delete this ${label}?`}
        message={`"${meal.name}" will be removed for good.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}
