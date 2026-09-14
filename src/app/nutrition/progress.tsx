import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { FilterPickerSheet, type FilterOption } from "@/components/FilterPickerSheet";
import { NutritionNavBar } from "@/components/NutritionNavBar";
import { SkewedStat } from "@/components/SkewedStat";
import { StatTile } from "@/components/StatTile";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey, isSameMonth, getCurrentWeekDates } from "@/lib/date";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { dayGoalStatus } from "@/lib/nutrition-day-status";
import { sumMacros } from "@/lib/nutrition-macros";
import { caloriesHistory, proteinHistory } from "@/lib/nutrition-history";
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
const BAR_CHART_HEIGHT = 140;
const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

type TrendMetric = "weight" | "calories" | "protein";
const TREND_OPTIONS: FilterOption<TrendMetric>[] = [
  { key: "weight", label: "Weight" },
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
];

type DayBar = { label: string; calories: number };

/** Last 7 days as vertical bars against a dashed target line — a different read than the Trends
 * area chart above (day-to-day variance around the target, not the overall trend shape), and a
 * different chart *type* entirely. One consistent color throughout (no under/over/on-target
 * color-coding) — the target line itself already shows how a day compares, a second color signal
 * on top of it was just noise. */
function WeeklyCalorieBars({ days, target }: { days: DayBar[]; target: number }) {
  const maxValue = Math.max(target, ...days.map((day) => day.calories), 1);
  const targetLinePercent = target > 0 ? Math.min(100, (target / maxValue) * 100) : null;

  return (
    <View style={{ height: BAR_CHART_HEIGHT }} className="flex-row items-end justify-between gap-2.5">
      {days.map((day) => {
        const heightPercent = Math.max(day.calories > 0 ? 3 : 0, (day.calories / maxValue) * 100);
        return (
          <View key={day.label} className="flex-1 items-center gap-1.5" style={{ height: "100%" }}>
            <View className="w-full flex-1 justify-end" style={{ position: "relative" }}>
              {targetLinePercent !== null && (
                <View
                  style={{ position: "absolute", left: 0, right: 0, bottom: `${targetLinePercent}%`, height: 1, backgroundColor: colors.neutral.textSecondary, opacity: 0.4 }}
                />
              )}
              <View style={{ height: `${heightPercent}%`, borderRadius: 6, backgroundColor: day.calories > 0 ? colors.brand.yellow : colors.neutral.divider }} />
            </View>
            <Text className="caption text-text-secondary">{day.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function displayWeight(weightKg: number, unit: "kg" | "lbs"): number {
  return unit === "kg" ? Math.round(weightKg * 10) / 10 : Math.round(kgToLbs(weightKg) * 10) / 10;
}

export default function NutritionProgressScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const [range, setRange] = useState<WeightRange>("30D");
  const [editingGoal, setEditingGoal] = useState(false);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const [trendMenuOpen, setTrendMenuOpen] = useState(false);

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

  const last7Days = useMemo(() => {
    const byDateKey = new Map<string, number>();
    for (const entry of foodLogEntries) byDateKey.set(entry.dateKey, (byDateKey.get(entry.dateKey) ?? 0) + entry.calories);
    const days: DayBar[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
      days.push({ label: date.toLocaleDateString("en-US", { weekday: "narrow" }), calories: Math.round(byDateKey.get(toDateKey(date)) ?? 0) });
    }
    return days;
  }, [foodLogEntries]);

  const recentCutoff = Date.now() - AVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentLogs = foodLogEntries.filter((entry) => entry.loggedAt >= recentCutoff);
  const loggedDays = new Set(recentLogs.map((entry) => entry.dateKey)).size || 1;
  const avgCalories = Math.round(recentLogs.reduce((sum, entry) => sum + entry.calories, 0) / loggedDays);
  const avgProtein = Math.round(recentLogs.reduce((sum, entry) => sum + entry.proteinG, 0) / loggedDays);

  const calorieSeries = useMemo(() => caloriesHistory(foodLogEntries, "day"), [foodLogEntries]);
  const proteinSeries = useMemo(() => proteinHistory(foodLogEntries, "day"), [foodLogEntries]);

  // Weight/Calories/Protein are all "how has this changed over time" questions — one card with a
  // dropdown to switch between them, instead of three near-identical stacked line charts.
  const trendLabel = TREND_OPTIONS.find((option) => option.key === trendMetric)?.label ?? "Weight";
  const trendSeries = trendMetric === "weight" ? weightSeries : trendMetric === "calories" ? calorieSeries : proteinSeries;
  const trendUnit = trendMetric === "weight" ? weightUnit : trendMetric === "calories" ? "kcal" : "g";
  const trendTitle = trendMetric === "weight" ? "Weight" : "Last 14 Days";
  const trendEmptyMessage =
    trendMetric === "weight"
      ? "Log your weight a couple of times to see a graph."
      : `Log a few more days to see a ${trendMetric} trend.`;

  // This week's macro split, by calorie contribution (protein/carbs 4 kcal/g, fat 9 kcal/g) — a
  // quick "where are my calories actually coming from" read that a calorie/protein number alone
  // doesn't answer.
  const macroSplit = useMemo(() => {
    const totalProteinG = recentLogs.reduce((sum, entry) => sum + entry.proteinG, 0);
    const totalCarbsG = recentLogs.reduce((sum, entry) => sum + entry.carbsG, 0);
    const totalFatG = recentLogs.reduce((sum, entry) => sum + entry.fatG, 0);
    const proteinKcal = totalProteinG * 4;
    const carbsKcal = totalCarbsG * 4;
    const fatKcal = totalFatG * 9;
    const totalKcal = proteinKcal + carbsKcal + fatKcal;
    if (totalKcal <= 0) return null;
    return {
      protein: Math.round((proteinKcal / totalKcal) * 100),
      carbs: Math.round((carbsKcal / totalKcal) * 100),
      fat: Math.round((fatKcal / totalKcal) * 100),
    };
  }, [recentLogs]);

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
    posthog.capture("weight_goal_set");
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 20 }} showsVerticalScrollIndicator={false}>
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
          <View className="flex-row items-center justify-between">
            <Text className="body-md font-body-semibold text-text-primary">Trends</Text>
            <Pressable
              onPress={() => setTrendMenuOpen(true)}
              style={PRESSED_STYLE}
              className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5"
            >
              <Text className="caption font-body-semibold text-text-secondary">{trendLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          {trendMetric === "weight" && (
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
          )}

          <View className="rounded-2xl border border-divider bg-surface p-4">
            {trendSeries.length >= 2 ? (
              <StrengthProgressChart exerciseName={trendMetric} points={trendSeries} title={trendTitle} unit={trendUnit} area />
            ) : (
              <Text className="body-sm py-6 text-center text-text-secondary">{trendEmptyMessage}</Text>
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
            <StatTile icon="barbell-outline" value={String(workoutsThisWeek)} label="Workouts" iconColor={colors.brand.yellow} />
            <StatTile icon="trophy-outline" value={String(prsThisMonth)} label="PRs This Month" iconColor={colors.brand.yellow} />
          </View>
          {daysOnTargetThisMonth !== null && (
            <View className="flex-row gap-3">
              <StatTile icon="checkmark-circle-outline" value={String(daysOnTargetThisMonth)} label="Days On Target This Month" iconColor={colors.brand.yellow} />
            </View>
          )}
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Calories vs Target — Last 7 Days</Text>
          <View className="rounded-2xl border border-divider bg-surface p-4">
            <WeeklyCalorieBars days={last7Days} target={targetCalories ?? 0} />
          </View>
        </View>

        {macroSplit && (
          <View className="gap-3">
            <Text className="body-md font-body-semibold text-text-primary">Macro Split This Week</Text>
            <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
              <View className="h-3 flex-row overflow-hidden rounded-full">
                <View style={{ flex: macroSplit.protein || 0.001, backgroundColor: NUTRITION_COLORS.protein }} />
                <View style={{ flex: macroSplit.carbs || 0.001, backgroundColor: NUTRITION_COLORS.carbs }} />
                <View style={{ flex: macroSplit.fat || 0.001, backgroundColor: NUTRITION_COLORS.fat }} />
              </View>
              <View className="flex-row justify-between">
                <View className="items-start gap-0.5">
                  <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.protein }}>{`${macroSplit.protein}%`}</Text>
                  <Text className="caption text-text-secondary">Protein</Text>
                </View>
                <View className="items-center gap-0.5">
                  <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.carbs }}>{`${macroSplit.carbs}%`}</Text>
                  <Text className="caption text-text-secondary">Carbs</Text>
                </View>
                <View className="items-end gap-0.5">
                  <Text className="caption font-body-bold" style={{ color: NUTRITION_COLORS.fat }}>{`${macroSplit.fat}%`}</Text>
                  <Text className="caption text-text-secondary">Fat</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <NutritionNavBar active="progress" dateKey={toDateKey(new Date())} />

      <FilterPickerSheet
        visible={trendMenuOpen}
        title="Show trend for"
        options={TREND_OPTIONS}
        selected={trendMetric}
        onSelect={setTrendMetric}
        onClose={() => setTrendMenuOpen(false)}
      />
    </View>
  );
}
