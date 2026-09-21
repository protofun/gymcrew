import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { FoodPickerModal } from "@/components/FoodPickerModal";
import { IngredientRow } from "@/components/IngredientRow";
import { MealTotalsHero } from "@/components/MealTotalsHero";
import { NutritionPageHeader } from "@/components/NutritionPageHeader";
import AnimatedInputBar from "@/components/ui/base/animated-input-bar";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import { Accordion } from "@/components/ui/molecules/accordion";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { AI_ACCORDION_THEME, AI_SAVE_BUTTON_COLORS } from "@/constants/ai-scan-theme";
import type { Food } from "@/data/nutrition-foods";
import type { MealItem, MealKind } from "@/lib/api";
import { goToNutrition } from "@/lib/nutrition-nav";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { scaleMacros, sumMacros } from "@/lib/nutrition-macros";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { colors, fontFamily } from "@/theme";

const COPY: Record<MealKind, { title: string; createTitle: string; subtitle: string; nameLabel: string; placeholders: string[]; save: string; empty: string }> = {
  meal: {
    title: "Edit meal",
    createTitle: "New meal",
    subtitle: "Add the ingredients once, then log the whole meal in one tap.",
    nameLabel: "MEAL NAME",
    placeholders: ["Chicken & rice", "Oats with berries", "Tuna pasta", "Sunday pancakes"],
    save: "Save meal",
    empty: "No ingredients yet — add the first one below.",
  },
  shake: {
    title: "Edit shake",
    createTitle: "New shake",
    subtitle: "Build your usual shake once, then it's one tap a day.",
    nameLabel: "SHAKE NAME",
    placeholders: ["GymCrew mass shake", "Post-workout blend", "Banana protein shake", "Breakfast smoothie"],
    save: "Save shake",
    empty: "Nothing in the blender yet — add the first ingredient below.",
  },
};

/** Meal & shake builder — one screen for both (see NUTRITION.md sections 14 & 17/18), since they're the same
 * data shape (a name + a list of food ingredients) and only need to *read* differently. The totals roll as the
 * ingredients change, each ingredient opens to an elastic slider, and the save button plays its animation. */
export default function MealBuilderScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { kind: kindParam, id } = useLocalSearchParams<{ kind?: MealKind; id?: string }>();
  const kind: MealKind = kindParam === "shake" ? "shake" : "meal";
  const copy = COPY[kind];

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
    else goToNutrition("foods", { tab: kind });
  }

  function handlePickFood(food: Food) {
    setItems((current) => [...current, { ...food, quantity: food.servingSize }]);
    setPickerVisible(false);
  }

  function commitSave() {
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
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>
        <NutritionPageHeader title={existing ? copy.title : copy.createTitle} subtitle={copy.subtitle} onBack={handleBack} />

        <View className="gap-7 px-5 pt-2">
          <Animated.View entering={FadeInDown.delay(100).springify().damping(16)} className="gap-1.5">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
              {copy.nameLabel}
            </Text>
            <View className="border-b border-divider">
              <AnimatedInputBar
                placeholders={copy.placeholders}
                value={name}
                onChangeText={setName}
                selectionColor={colors.brand.yellow}
                containerStyle={{ marginVertical: 0 }}
                inputWrapperStyle={{ paddingHorizontal: 0, paddingVertical: 10, minHeight: 46 }}
                placeholderLeft={0}
                animationInterval={2600}
                placeholderStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 18 }}
                inputStyle={{ fontFamily: fontFamily.bodySemiBold, fontSize: 18 }}
              />
            </View>
          </Animated.View>

          {items.length > 0 && <MealTotalsHero totals={totals} />}

          <View className="gap-1">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
              {`INGREDIENTS · ${items.length}`}
            </Text>
            {items.length === 0 ? (
              <Text className="body-sm py-6 text-center text-text-secondary">{copy.empty}</Text>
            ) : (
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
            )}

            <Pressable onPress={() => setPickerVisible(true)} className="mt-4 flex-row items-center justify-center gap-2 rounded-full border border-dashed border-divider py-3.5">
              <Ionicons name="add" size={18} color={colors.brand.yellow} />
              <Text className="body-sm font-body-semibold text-brand-yellow">Add ingredient</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.delay(250).springify()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 12, backgroundColor: colors.neutral.background }}
        className="flex-row items-center justify-between gap-4 border-t border-divider px-5 pt-3"
      >
        <View className="gap-0.5">
          <Text className="caption font-body-semibold text-text-secondary">{`${items.length} ${items.length === 1 ? "INGREDIENT" : "INGREDIENTS"}`}</Text>
          <View className="flex-row items-baseline gap-1.5">
            <NumberFlow value={totals.calories} fontSize={24} color={colors.brand.white} fontWeight="800" />
            <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.calories }}>
              kcal
            </Text>
          </View>
        </View>
        <SaveButton.Root onSave={commitSave} onSaved={() => goToNutrition("foods", { tab: kind })} disabled={!canSave} colors={AI_SAVE_BUTTON_COLORS} minLoading={350} successPause={250}>
          <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Save</SaveButton.Label>
          <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Saved</SaveButton.Saved>
        </SaveButton.Root>
      </Animated.View>

      <FoodPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handlePickFood} />
    </View>
  );
}
