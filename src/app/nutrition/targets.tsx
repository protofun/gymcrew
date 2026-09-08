import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconBadge } from "@/components/IconBadge";
import { SkewedStat } from "@/components/SkewedStat";
import type { Macros } from "@/lib/nutrition-macros";
import {
  ACTIVITY_LEVELS,
  NUTRITION_GOALS,
  calculateSuggestedTargets,
  type ActivityLevel,
  type NutritionGoal,
} from "@/lib/nutrition-targets";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

function OptionRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { key: T; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[];
  selected: T | null;
  onSelect: (key: T) => void;
}) {
  return (
    <View className="gap-2">
      {options.map((option) => {
        const isSelected = selected === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${isSelected ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-surface"}`}
          >
            <IconBadge icon={option.icon} color={isSelected ? colors.brand.yellow : colors.neutral.textSecondary} size={34} />
            <View className="flex-1 gap-0.5">
              <Text className={`body-md font-body-semibold ${isSelected ? "text-brand-yellow" : "text-text-primary"}`}>{option.label}</Text>
              <Text className="caption text-text-secondary">{option.description}</Text>
            </View>
            <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={20} color={isSelected ? colors.brand.yellow : colors.neutral.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

function MacroInput({ label, value, onChangeText, suffix }: { label: string; value: string; onChangeText: (text: string) => void; suffix: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
      <View className="flex-row items-center gap-1 rounded-xl border border-divider bg-surface px-3 py-2.5">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          className="body-md flex-1 text-text-primary"
        />
        <Text className="caption text-text-secondary">{suffix}</Text>
      </View>
    </View>
  );
}

/** Daily targets setup/override — see NUTRITION.md section 20/21. Always presented as an estimate
 * (never medical advice) and always overridable, per that section's explicit requirement. */
export default function NutritionTargetsScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const currentTargets = useNutritionTargetsStore((state) => state);
  const setTargets = useNutritionTargetsStore((state) => state.setTargets);

  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(currentTargets.activityLevel);
  const [goal, setGoal] = useState<NutritionGoal | null>(currentTargets.goal);
  const [manualCalories, setManualCalories] = useState(currentTargets.calories !== null ? String(currentTargets.calories) : "");
  const [manualProtein, setManualProtein] = useState(currentTargets.proteinG !== null ? String(currentTargets.proteinG) : "");
  const [manualCarbs, setManualCarbs] = useState(currentTargets.carbsG !== null ? String(currentTargets.carbsG) : "");
  const [manualFat, setManualFat] = useState(currentTargets.fatG !== null ? String(currentTargets.fatG) : "");
  const [editingManually, setEditingManually] = useState(false);

  const hasProfile = onboarding.weightKg && onboarding.heightCm && onboarding.age && onboarding.gender;

  const suggested: Macros | null = useMemo(() => {
    if (!hasProfile || !activityLevel || !goal || goal === "custom") return null;
    return calculateSuggestedTargets({
      weightKg: onboarding.weightKg!,
      heightCm: onboarding.heightCm!,
      age: onboarding.age!,
      gender: onboarding.gender!,
      activityLevel,
      goal,
    });
  }, [hasProfile, activityLevel, goal, onboarding.weightKg, onboarding.heightCm, onboarding.age, onboarding.gender]);

  function num(text: string, fallback: number): number {
    const parsed = parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function handleUseSuggested() {
    if (!suggested || !activityLevel || !goal) return;
    setTargets(suggested, goal, activityLevel, false);
    router.back();
  }

  function handleSaveManual() {
    const macros: Macros = {
      calories: num(manualCalories, 0),
      proteinG: num(manualProtein, 0),
      carbsG: num(manualCarbs, 0),
      fatG: num(manualFat, 0),
    };
    setTargets(macros, goal ?? "custom", activityLevel ?? "moderate", true);
    router.back();
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Daily Targets</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 24 }} showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="body-md font-body-semibold text-text-primary">Activity Level</Text>
          <OptionRow options={ACTIVITY_LEVELS} selected={activityLevel} onSelect={setActivityLevel} />
        </View>

        <View className="gap-2">
          <Text className="body-md font-body-semibold text-text-primary">Goal</Text>
          <OptionRow options={NUTRITION_GOALS} selected={goal} onSelect={(key) => { setGoal(key); if (key === "custom") setEditingManually(true); }} />
        </View>

        {!hasProfile && (
          <Text className="body-sm text-text-secondary">Add your weight, height, age, and gender in your profile to get a suggested target.</Text>
        )}

        {suggested && !editingManually && (
          <View className="gap-3 overflow-hidden rounded-2xl border border-divider bg-surface">
            <View style={{ height: 4, backgroundColor: colors.brand.yellow }} />
            <View className="gap-3 px-4 pb-4">
              <Text className="body-sm text-text-secondary">Suggested Daily Target</Text>
              <SkewedStat size={34} color={colors.neutral.textPrimary}>{`${suggested.calories} kcal`}</SkewedStat>
              <Text className="body-sm text-text-secondary">{`${suggested.proteinG}g protein · ${suggested.carbsG}g carbs · ${suggested.fatG}g fat`}</Text>
              <Text className="caption text-text-secondary">
                This is an estimate based on your profile — not medical advice. You can adjust it any time.
              </Text>
              <View className="mt-1 flex-row gap-3">
                <Pressable onPress={() => setEditingManually(true)} className="flex-1 items-center rounded-full border border-divider py-3">
                  <Text className="body-sm font-body-semibold text-text-primary">Edit Manually</Text>
                </Pressable>
                <Pressable onPress={handleUseSuggested} className="flex-1 items-center rounded-full bg-brand-yellow py-3">
                  <Text className="body-sm font-body-semibold text-brand-iron">Use This</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {(editingManually || goal === "custom" || !suggested) && (
          <View className="gap-3">
            <Text className="body-md font-body-semibold text-text-primary">Set Your Own Numbers</Text>
            <MacroInput label="Calories" value={manualCalories} onChangeText={setManualCalories} suffix="kcal" />
            <View className="flex-row gap-3">
              <MacroInput label="Protein" value={manualProtein} onChangeText={setManualProtein} suffix="g" />
              <MacroInput label="Carbs" value={manualCarbs} onChangeText={setManualCarbs} suffix="g" />
              <MacroInput label="Fat" value={manualFat} onChangeText={setManualFat} suffix="g" />
            </View>
            <Pressable onPress={handleSaveManual} className="mt-1 items-center rounded-full bg-brand-yellow py-4">
              <Text className="body-md font-body-semibold text-brand-iron">Save Targets</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
