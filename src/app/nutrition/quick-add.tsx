import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { toDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotForTime, type MealSlot } from "@/lib/meal-slot";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { colors } from "@/theme";

function NumberField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <Text className="body-sm text-text-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
      />
    </View>
  );
}

/** A fast catch-all entry for anything not worth searching for — "ate at a restaurant, roughly 600
 * kcal" — same "Quick Add Calories" escape hatch every major food logger (MyFitnessPal, Lose It!,
 * Lifesum) offers alongside real food search, since insisting on a matched food for every bite is
 * exactly the friction that makes logging feel tedious. */
export default function QuickAddScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const addEntry = useNutritionLogStore((state) => state.addEntry);

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [mealSlot, setMealSlot] = useState<MealSlot>(mealSlotForTime());

  function num(text: string): number {
    const parsed = parseFloat(text.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const canSave = calories.trim() !== "" && num(calories) > 0;

  function handleSave() {
    if (!canSave) return;
    addEntry({
      foodId: null,
      mealId: null,
      name: name.trim() || "Quick Add",
      mealSlot,
      quantity: 1,
      unit: "entry",
      calories: num(calories),
      proteinG: num(proteinG),
      carbsG: num(carbsG),
      fatG: num(fatG),
      dateKey: date ?? toDateKey(new Date()),
    });
    posthog.capture("food_logged", { source: "quick_add", meal_slot: mealSlot, calories: num(calories) });
    router.replace("/nutrition");
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/nutrition/add");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Quick Add</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text className="body-sm text-text-secondary">
          Log calories fast without searching for an exact food — good for eating out, a quick estimate, or anything you can&apos;t find.
        </Text>

        <View className="gap-1.5">
          <Text className="body-sm text-text-secondary">Name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Restaurant lunch"
            placeholderTextColor={colors.neutral.textSecondary}
            className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
          />
        </View>

        <NumberField label="Calories" value={calories} onChangeText={setCalories} placeholder="e.g. 600" />

        <View className="flex-row gap-3">
          <NumberField label="Protein (g, optional)" value={proteinG} onChangeText={setProteinG} />
          <NumberField label="Carbs (g, optional)" value={carbsG} onChangeText={setCarbsG} />
          <NumberField label="Fat (g, optional)" value={fatG} onChangeText={setFatG} />
        </View>

        <View className="gap-2">
          <Text className="body-sm text-text-secondary">Meal</Text>
          <View className="flex-row gap-2">
            {MEAL_SLOTS.map((option) => {
              const selected = mealSlot === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setMealSlot(option.key)}
                  className={`flex-1 items-center rounded-xl border py-2.5 ${selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
                >
                  <Text className={`caption font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={handleSave} disabled={!canSave} className={`mt-2 items-center rounded-full py-4 ${canSave ? "bg-brand-yellow" : "bg-surface"}`}>
          <Text className={`body-md font-body-semibold ${canSave ? "text-brand-iron" : "text-text-secondary"}`}>Add to Log</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
