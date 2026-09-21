import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goToNutrition } from "@/lib/nutrition-nav";
import { AmountPicker } from "@/components/AmountPicker";
import { MealActionBar } from "@/components/MealActionBar";
import { NutritionPageHeader } from "@/components/NutritionPageHeader";
import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { colors } from "@/theme";

function MacroField({ label, value, onChangeText, color }: { label: string; value: string; onChangeText: (text: string) => void; color: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <View className="flex-row items-center gap-1.5">
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text className="caption font-body-bold text-text-secondary">{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md border-b border-divider pb-2 text-text-primary"
      />
    </View>
  );
}

function num(text: string): number {
  const parsed = parseFloat(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A fast catch-all entry for anything not worth searching for — "ate at a restaurant, roughly 600
 * kcal" — same "Quick Add Calories" escape hatch every major food logger (MyFitnessPal, Lose It!,
 * Lifesum) offers alongside real food search, since insisting on a matched food for every bite is
 * exactly the friction that makes logging feel tedious. The calories are picked on a ruler. */
export default function QuickAddScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { date, slot } = useLocalSearchParams<{ date?: string; slot?: string }>();
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const [name, setName] = useState("");
  const [calories, setCalories] = useState(300);
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [mealSlot, setMealSlot] = useState<MealSlot>(MEAL_SLOTS.find((option) => option.key === slot)?.key ?? mealSlotForTime());

  function commitAdd() {
    addEntry({
      foodId: null,
      mealId: null,
      name: name.trim() || "Quick Add",
      mealSlot,
      quantity: 1,
      unit: "entry",
      calories,
      proteinG: num(proteinG),
      carbsG: num(carbsG),
      fatG: num(fatG),
      dateKey: date ?? toDateKey(new Date()),
    });
    posthog.capture("food_logged", { source: "quick_add", meal_slot: mealSlot, calories });
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/add");
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>
        <NutritionPageHeader title="Quick add" subtitle="Log calories fast — good for eating out, a rough estimate, or anything you can't find." onBack={handleBack} />

        <View className="gap-8 px-5 pt-4">
          <Animated.View entering={FadeInDown.delay(100).springify().damping(16)} className="gap-1.5">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
              WHAT WAS IT? (OPTIONAL)
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Restaurant lunch"
              placeholderTextColor={colors.neutral.textSecondary}
              className="body-lg border-b border-divider pb-2 text-text-primary"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify().damping(16)}>
            <AmountPicker
              value={calories}
              unit="kcal"
              min={10}
              max={2000}
              step={10}
              onChange={setCalories}
              presets={[100, 250, 500, 750, 1000].map((value) => ({ label: `${value}`, value }))}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify().damping(16)} className="gap-3">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
              MACROS (OPTIONAL, GRAMS)
            </Text>
            <View className="flex-row gap-5">
              <MacroField label="PROTEIN" value={proteinG} onChangeText={setProteinG} color={NUTRITION_COLORS.protein} />
              <MacroField label="CARBS" value={carbsG} onChangeText={setCarbsG} color={NUTRITION_COLORS.carbs} />
              <MacroField label="FAT" value={fatG} onChangeText={setFatG} color={NUTRITION_COLORS.fat} />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <MealActionBar mealSlot={mealSlot} onChangeMealSlot={setMealSlot} actionLabel="Add to" saveLabel="Add" savedLabel="Added" onSave={commitAdd} onSaved={() => goToNutrition()} />
    </View>
  );
}
