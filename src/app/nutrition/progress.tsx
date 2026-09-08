import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkewedStat } from "@/components/SkewedStat";
import { StatTile } from "@/components/StatTile";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey, isSameMonth, getCurrentWeekDates } from "@/lib/date";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { dayGoalStatus } from "@/lib/nutrition-day-status";
import { sumMacros } from "@/lib/nutrition-macros";
import { kgToLbs, lbsToKg } from "@/lib/units";
import { weeklyWeightTrendKg } from "@/lib/weight-trend";
import { useBodyLogStore } from "@/store/body-log-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

type WeightRange = "7D" | "30D" | "3M" | "6M" | "1Y";
const RANGE_DAYS: Record<WeightRange, number> = { "7D": 7, "30D": 30, "3M": 90, "6M": 180, "1Y": 365 };
const RANGES: WeightRange[] = ["7D", "30D", "3M", "6M", "1Y"];
const AVERAGE_WINDOW_DAYS = 7;

function displayWeight(weightKg: number, unit: "kg" | "lbs"): number {
  return unit === "kg" ? Math.round(weightKg * 10) / 10 : Math.round(kgToLbs(weightKg) * 10) / 10;
}

export default function NutritionProgressScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<WeightRange>("30D");
  const [editingGoal, setEditingGoal] = useState(false);

  const bodyLogEntries = useBodyLogStore((state) => state.entries);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const goalWeightKg = useNutritionTargetsStore((state) => state.goalWeightKg);
  const setGoalWeightKg = useNutritionTargetsStore((state) => state.setGoalWeightKg);
  const targetCalories = useNutritionTargetsStore((state) => state.calories);
  const targetProteinG = useNutritionTargetsStore((state) => state.proteinG);
  const [goalDraft, setGoalDraft] = useState(goalWeightKg !== null ? String(displayWeight(goalWeightKg, weightUnit)) : "");

  const foodLogEntries = useNutritionLogStore((state) => state.entries);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);

  const sortedAsc = useMemo(() => [...bodyLogEntries].sort((a, b) => a.loggedAt - b.loggedAt), [bodyLogEntries]);
  const currentWeightKg = sortedAsc[sortedAsc.length - 1]?.weightKg ?? null;
  const startingWeightKg = sortedAsc[0]?.weightKg ?? null;

  const rangeCutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  const weightSeries = useMemo(
    () =>
      sortedAsc
        .filter((entry) => entry.loggedAt >= rangeCutoff)
        .map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: displayWeight(entry.weightKg, weightUnit) })),
    [sortedAsc, rangeCutoff, weightUnit],
  );

  const weeklyTrendKg = useMemo(() => weeklyWeightTrendKg(bodyLogEntries), [bodyLogEntries]);
  const weeklyTrendDisplay = weeklyTrendKg !== null ? (weightUnit === "kg" ? weeklyTrendKg : Math.round(kgToLbs(weeklyTrendKg) * 100) / 100) : null;

  const recentCutoff = Date.now() - AVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentLogs = foodLogEntries.filter((entry) => entry.loggedAt >= recentCutoff);
  const loggedDays = new Set(recentLogs.map((entry) => entry.dateKey)).size || 1;
  const avgCalories = Math.round(recentLogs.reduce((sum, entry) => sum + entry.calories, 0) / loggedDays);
  const avgProtein = Math.round(recentLogs.reduce((sum, entry) => sum + entry.proteinG, 0) / loggedDays);

  const weekDates = new Set(getCurrentWeekDates(new Date()).map((date) => toDateKey(date)));
  const workoutsThisWeek = workouts.filter((workout) => weekDates.has(toDateKey(new Date(workout.completedAt)))).length;
  const prsThisMonth = workouts
    .filter((workout) => isSameMonth(new Date(workout.completedAt), new Date()))
    .reduce((sum, workout) => sum + workout.prs.length, 0);

  const daysOnTargetThisMonth = useMemo(() => {
    if (targetCalories === null || targetProteinG === null) return null;
    const targets = { calories: targetCalories, proteinG: targetProteinG, carbsG: 0, fatG: 0 };
    const byDay = new Map<string, typeof foodLogEntries>();
    for (const entry of foodLogEntries) {
      if (!isSameMonth(new Date(entry.loggedAt), new Date())) continue;
      byDay.set(entry.dateKey, [...(byDay.get(entry.dateKey) ?? []), entry]);
    }
    let hit = 0;
    for (const dayEntries of byDay.values()) {
      if (dayGoalStatus(sumMacros(dayEntries), targets) === "hit") hit++;
    }
    return hit;
  }, [foodLogEntries, targetCalories, targetProteinG]);

  function handleSaveGoal() {
    const parsed = parseFloat(goalDraft.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEditingGoal(false);
      return;
    }
    const kg = weightUnit === "kg" ? parsed : lbsToKg(parsed);
    setGoalWeightKg(kg);
    setEditingGoal(false);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Progress</Text>
        <Pressable onPress={() => router.push("/profile/body-log")} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="add-circle" size={26} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View className="items-center gap-2 rounded-3xl border border-divider bg-surface py-6">
          <Text className="body-sm text-text-secondary">Current Weight</Text>
          <SkewedStat id="nutrition.progress.currentWeight" size={44} color={colors.neutral.textPrimary}>
            {currentWeightKg !== null ? `${displayWeight(currentWeightKg, weightUnit)} ${weightUnit}` : "—"}
          </SkewedStat>
          {weeklyTrendDisplay !== null && (
            <View
              className="mt-1 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: `${weeklyTrendDisplay > 0 ? colors.semantic.success : weeklyTrendDisplay < 0 ? colors.semantic.error : colors.neutral.textSecondary}1A`,
              }}
            >
              <Ionicons
                name={weeklyTrendDisplay > 0 ? "trending-up" : weeklyTrendDisplay < 0 ? "trending-down" : "remove"}
                size={13}
                color={weeklyTrendDisplay > 0 ? colors.semantic.success : weeklyTrendDisplay < 0 ? colors.semantic.error : colors.neutral.textSecondary}
              />
              <Text
                className="caption font-body-bold"
                style={{ color: weeklyTrendDisplay > 0 ? colors.semantic.success : weeklyTrendDisplay < 0 ? colors.semantic.error : colors.neutral.textSecondary }}
              >
                {`${weeklyTrendDisplay > 0 ? "+" : ""}${weeklyTrendDisplay} ${weightUnit}/week`}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Weight Progress</Text>
          <View className="flex-row rounded-full border border-divider bg-surface p-1">
            {RANGES.map((option) => {
              const active = option === range;
              return (
                <Pressable key={option} onPress={() => setRange(option)} className={`flex-1 items-center rounded-full py-1.5 ${active ? "bg-brand-yellow" : ""}`}>
                  <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="rounded-2xl border border-divider bg-surface p-4">
            {weightSeries.length >= 2 ? (
              <StrengthProgressChart exerciseName="body weight" points={weightSeries} title="Weight" unit={weightUnit} />
            ) : (
              <Text className="body-sm py-6 text-center text-text-secondary">Log your weight a couple of times to see a graph.</Text>
            )}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">Starting</Text>
            <Text className="body-md font-body-semibold text-text-primary">{startingWeightKg !== null ? `${displayWeight(startingWeightKg, weightUnit)}${weightUnit}` : "—"}</Text>
          </View>
          <View className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">Current</Text>
            <Text className="body-md font-body-semibold text-text-primary">{currentWeightKg !== null ? `${displayWeight(currentWeightKg, weightUnit)}${weightUnit}` : "—"}</Text>
          </View>
          <Pressable onPress={() => setEditingGoal(true)} className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">Goal</Text>
            {editingGoal ? (
              <TextInput
                value={goalDraft}
                onChangeText={setGoalDraft}
                onBlur={handleSaveGoal}
                onSubmitEditing={handleSaveGoal}
                keyboardType="decimal-pad"
                autoFocus
                className="body-md text-center text-text-primary"
                style={{ minWidth: 40, outlineWidth: 0 }}
              />
            ) : (
              <Text className="body-md font-body-semibold text-text-primary">{goalWeightKg !== null ? `${displayWeight(goalWeightKg, weightUnit)}${weightUnit}` : "Set"}</Text>
            )}
          </Pressable>
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">This Week</Text>
          <View className="flex-row gap-3">
            <StatTile icon="flame-outline" value={`${avgCalories}`} label="Avg Calories" iconColor={NUTRITION_COLORS.calories} />
            <StatTile icon="restaurant-outline" value={`${avgProtein}g`} label="Avg Protein" iconColor={NUTRITION_COLORS.protein} />
          </View>
          <View className="flex-row gap-3">
            <StatTile icon="barbell-outline" value={String(workoutsThisWeek)} label="Workouts" iconColor={colors.semantic.info} />
            <StatTile icon="trophy-outline" value={String(prsThisMonth)} label="PRs This Month" iconColor={colors.semantic.success} />
          </View>
          {daysOnTargetThisMonth !== null && (
            <View className="flex-row gap-3">
              <StatTile icon="checkmark-circle-outline" value={String(daysOnTargetThisMonth)} label="Days On Target This Month" iconColor={colors.semantic.success} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
