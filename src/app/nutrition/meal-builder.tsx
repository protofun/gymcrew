import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { FoodPickerModal } from "@/components/FoodPickerModal";
import { MacroTotalsBar } from "@/components/MacroTotalsBar";
import { MealItemRow } from "@/components/MealItemRow";
import type { Food } from "@/data/nutrition-foods";
import type { MealItem, MealKind } from "@/lib/api";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors } from "@/theme";

const KIND_COPY: Record<MealKind, { title: string; createTitle: string; icon: keyof typeof Ionicons.glyphMap; save: string }> = {
  meal: { title: "Edit Meal", createTitle: "Create Meal", icon: "restaurant-outline", save: "Save Meal" },
  shake: { title: "Edit Shake", createTitle: "Build Your Shake", icon: "nutrition-outline", save: "Save Shake" },
};

/** Meal & shake builder — one screen for both (see NUTRITION.md sections 14 & 17/18), since they're
 * the same data shape (a name + a list of food ingredients) and only need to *read* differently, not
 * work differently. `kind` picks the copy/icon; a shake's accent icon is the only real UI delta the
 * spec actually asks for. */
export default function MealBuilderScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { kind: kindParam, id } = useLocalSearchParams<{ kind?: MealKind; id?: string }>();
  const kind: MealKind = kindParam === "shake" ? "shake" : "meal";
  const copy = KIND_COPY[kind];

  const meals = useNutritionMealsStore((state) => state.meals);
  const saveMeal = useNutritionMealsStore((state) => state.saveMeal);
  const existing = useMemo(() => (id ? meals.find((meal) => meal.id === id) : undefined), [meals, id]);

  const [name, setName] = useState(existing?.name ?? "");
  const [items, setItems] = useState<MealItem[]>(existing?.items ?? []);
  const [pickerVisible, setPickerVisible] = useState(false);

  const totals = useMemo(() => sumMacros(items.map((item) => scaleMacros(item, item.quantity))), [items]);
  const canSave = name.trim().length > 0 && items.length > 0;

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/my-meals");
  }

  function handlePickFood(food: Food) {
    setItems((current) => [...current, { ...food, quantity: food.servingSize }]);
    setPickerVisible(false);
  }

  function handleChangeQuantity(index: number, quantity: number) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, quantity } : item)));
  }

  function handleRemoveItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!canSave) return;
    saveMeal({
      id: existing?.id,
      kind,
      name: name.trim(),
      description: "",
      items,
      totalCalories: totals.calories,
      totalProteinG: totals.proteinG,
      totalCarbsG: totals.carbsG,
      totalFatG: totals.fatG,
    });
    posthog.capture(existing ? "meal_updated" : "meal_created", {
      kind,
      ingredient_count: items.length,
      calories: totals.calories,
    });
    router.replace("/nutrition/my-meals");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Ionicons name={copy.icon} size={16} color={colors.brand.yellow} />
          <Text className="heading-4 text-text-primary">{existing ? copy.title : copy.createTitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="gap-1.5">
          <Text className="body-sm text-text-secondary">{kind === "shake" ? "Shake Name" : "Meal Name"}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={kind === "shake" ? "e.g. GymCrew Mass Shake" : "e.g. Chicken & Rice"}
            placeholderTextColor={colors.neutral.textSecondary}
            className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
          />
        </View>

        <View className="gap-2.5">
          <Text className="body-sm font-body-semibold text-text-secondary">INGREDIENTS</Text>
          {items.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-10">
              <Ionicons name={copy.icon} size={24} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-text-secondary">No ingredients yet.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {items.map((item, index) => (
                <MealItemRow
                  key={`${item.id}-${index}`}
                  item={item}
                  onChangeQuantity={(quantity) => handleChangeQuantity(index, quantity)}
                  onRemove={() => handleRemoveItem(index)}
                />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => setPickerVisible(true)}
            className="flex-row items-center justify-center gap-2 rounded-full border border-dashed border-divider py-3.5"
          >
            <Ionicons name="add" size={18} color={colors.brand.yellow} />
            <Text className="body-sm font-body-semibold text-brand-yellow">Add Ingredient</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-3 border-t border-divider bg-surface px-4 pt-3">
        <MacroTotalsBar totals={totals} />
        <Pressable onPress={handleSave} disabled={!canSave} className={`items-center rounded-full py-4 ${canSave ? "bg-brand-yellow" : "bg-background"}`}>
          <Text className={`body-md font-body-semibold ${canSave ? "text-brand-iron" : "text-text-secondary"}`}>{copy.save}</Text>
        </Pressable>
      </View>

      <FoodPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handlePickFood} />
    </View>
  );
}
