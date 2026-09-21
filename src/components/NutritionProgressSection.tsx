import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { Easing, FadeInDown, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { AiScanMacroRing } from "@/components/AiScanMacroRing";
import { DiaryWeekChart } from "@/components/DiaryWeekChart";
import { GoalWeightSheet } from "@/components/GoalWeightSheet";
import { HeaderRoundButton, NutritionPageHeader } from "@/components/NutritionPageHeader";
import { ProgressConsistency, type ConsistencyCell } from "@/components/ProgressConsistency";
import { ProgressReceipt } from "@/components/ProgressReceipt";
import { ProgressStatGrid, type ProgressStat } from "@/components/ProgressStatGrid";
import { TextTicker } from "@/components/TextTicker";
import { TrendChart } from "@/components/TrendChart";
import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { AnimatedChip } from "@/components/ui/molecules/animated-chip";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { nutritionIcons } from "@/constants/images";
import { addDays, getCurrentWeekDates, isSameMonth, toDateKey } from "@/lib/date";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { dayGoalStatus } from "@/lib/nutrition-day-status";
import { caloriesHistory, proteinHistory } from "@/lib/nutrition-history";
import { sumMacros } from "@/lib/nutrition-macros";
import { computeLoggingStreak, computeLongestLoggingStreak } from "@/lib/nutrition-streak";
import { kgToLbs, lbsToKg } from "@/lib/units";
import { weeklyWeightTrendKg } from "@/lib/weight-trend";
import { useBodyLogStore } from "@/store/body-log-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWaterLogStore } from "@/store/water-log-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type WeightRange = "7D" | "30D" | "3M" | "6M" | "1Y";
const RANGE_DAYS: Record<WeightRange, number> = { "7D": 7, "30D": 30, "3M": 90, "6M": 180, "1Y": 365 };
const RANGES: WeightRange[] = ["7D", "30D", "3M", "6M", "1Y"];
const DAY_MS = 24 * 60 * 60 * 1000;

type TrendMetric = "weight" | "calories" | "protein";
const TREND_OPTIONS: { key: TrendMetric; label: string; image: ImageSourcePropType }[] = [
  { key: "weight", label: "Weight", image: nutritionIcons.progress },
  { key: "calories", label: "Calories", image: nutritionIcons.calories },
  { key: "protein", label: "Protein", image: nutritionIcons.protein },
];

function displayWeight(weightKg: number, unit: "kg" | "lbs"): number {
  return unit === "kg" ? Math.round(weightKg * 10) / 10 : Math.round(kgToLbs(weightKg) * 10) / 10;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>{children}</Text>;
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 && current > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

/** Nutrition → Progress: how the body and the food are moving. A weight hero with a goal ring, the week's
 * numbers against last week, trend lines, the calorie and macro picture, a five-week consistency grid,
 * and a receipt of the week. Built from the Reacticx pieces in components/ui. */
export function NutritionProgressSection() {
  const posthog = usePostHog();
  const [range, setRange] = useState<WeightRange>("30D");
  const [rangesWidth, setRangesWidth] = useState(0);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const bodyLogEntries = useBodyLogStore((state) => state.entries);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const goalWeightKg = useNutritionTargetsStore((state) => state.goalWeightKg);
  const setGoalWeightKg = useNutritionTargetsStore((state) => state.setGoalWeightKg);
  const targetCalories = useNutritionTargetsStore((state) => state.calories);
  const targetProteinG = useNutritionTargetsStore((state) => state.proteinG);
  const hasTargets = targetCalories !== null && targetProteinG !== null;

  const foodLogEntries = useNutritionLogStore((state) => state.entries);
  const waterEntries = useWaterLogStore((state) => state.entries);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);

  const now = Date.now();
  const today = useMemo(() => new Date(), []);

  // ─── Weight ───
  const sortedAsc = useMemo(() => [...bodyLogEntries].sort((a, b) => a.loggedAt - b.loggedAt), [bodyLogEntries]);
  const currentWeightKg = sortedAsc[sortedAsc.length - 1]?.weightKg ?? null;
  const startingWeightKg = sortedAsc[0]?.weightKg ?? null;
  const rangeCutoff = now - RANGE_DAYS[range] * DAY_MS;
  const weightSeries = useMemo(
    () => sortedAsc.filter((entry) => entry.loggedAt >= rangeCutoff).map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: displayWeight(entry.weightKg, weightUnit) })),
    [sortedAsc, rangeCutoff, weightUnit],
  );
  const weeklyTrendKg = useMemo(() => weeklyWeightTrendKg(bodyLogEntries), [bodyLogEntries]);
  const weeklyTrendDisplay = weeklyTrendKg !== null ? (weightUnit === "kg" ? weeklyTrendKg : Math.round(kgToLbs(weeklyTrendKg) * 100) / 100) : null;

  // How far from the starting weight to the goal has been walked — the ring on the hero.
  const goalPercent =
    goalWeightKg !== null && startingWeightKg !== null && currentWeightKg !== null && startingWeightKg !== goalWeightKg
      ? Math.round(Math.min(1, Math.max(0, (startingWeightKg - currentWeightKg) / (startingWeightKg - goalWeightKg))) * 100)
      : goalWeightKg !== null && currentWeightKg !== null && currentWeightKg === goalWeightKg
        ? 100
        : null;
  const goalRing = useSharedValue(0);
  useEffect(() => {
    goalRing.value = withDelay(200, withTiming(goalPercent ?? 0, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [goalPercent, goalRing]);

  // ─── Food, by day ───
  const totalsByDateKey = useMemo(() => {
    const byDay = new Map<string, typeof foodLogEntries>();
    for (const entry of foodLogEntries) byDay.set(entry.dateKey, [...(byDay.get(entry.dateKey) ?? []), entry]);
    return new Map(Array.from(byDay, ([key, list]) => [key, sumMacros(list)]));
  }, [foodLogEntries]);
  const loggedDateKeys = useMemo(() => new Set(totalsByDateKey.keys()), [totalsByDateKey]);

  const last7Days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now - (6 - index) * DAY_MS);
        return { label: date.toLocaleDateString("en-US", { weekday: "narrow" }), calories: Math.round(totalsByDateKey.get(toDateKey(date))?.calories ?? 0) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalsByDateKey],
  );

  const recentLogs = foodLogEntries.filter((entry) => entry.loggedAt >= now - 7 * DAY_MS);
  const previousLogs = foodLogEntries.filter((entry) => entry.loggedAt >= now - 14 * DAY_MS && entry.loggedAt < now - 7 * DAY_MS);
  const dayCount = (list: typeof foodLogEntries) => new Set(list.map((entry) => entry.dateKey)).size || 1;
  const average = (list: typeof foodLogEntries, pick: (entry: (typeof foodLogEntries)[number]) => number) => Math.round(list.reduce((sum, entry) => sum + pick(entry), 0) / dayCount(list));
  const avgCalories = average(recentLogs, (entry) => entry.calories);
  const avgProtein = average(recentLogs, (entry) => entry.proteinG);
  const avgCarbs = average(recentLogs, (entry) => entry.carbsG);
  const avgFat = average(recentLogs, (entry) => entry.fatG);
  const daysLoggedRecent = new Set(recentLogs.map((entry) => entry.dateKey)).size;

  const macroKcal = { protein: avgProtein * 4, carbs: avgCarbs * 4, fat: avgFat * 9 };
  const macroKcalSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const percentOf = (value: number) => (macroKcalSum > 0 ? (value / macroKcalSum) * 100 : 0);

  const calorieSeries = useMemo(() => caloriesHistory(foodLogEntries, "day"), [foodLogEntries]);
  const proteinSeries = useMemo(() => proteinHistory(foodLogEntries, "day"), [foodLogEntries]);
  const trendSeries = trendMetric === "weight" ? weightSeries : trendMetric === "calories" ? calorieSeries : proteinSeries;
  const trendUnit = trendMetric === "weight" ? weightUnit : trendMetric === "calories" ? "kcal" : "g";
  const trendLatest = trendSeries[trendSeries.length - 1]?.value ?? null;
  const trendDelta = trendSeries.length >= 2 ? Math.round((trendSeries[trendSeries.length - 1].value - trendSeries[0].value) * 10) / 10 : null;
  const trendEmptyMessage = trendMetric === "weight" ? "Log your weight a couple of times to see a graph." : `Log a few more days to see a ${trendMetric} trend.`;

  // ─── Training and water ───
  const weekDates = new Set(getCurrentWeekDates(today).map((date) => toDateKey(date)));
  const workoutsThisWeek = workouts.filter((workout) => weekDates.has(toDateKey(new Date(workout.completedAt)))).length;
  const prsThisMonth = workouts.filter((workout) => isSameMonth(new Date(workout.completedAt), today)).reduce((sum, workout) => sum + workout.prs.length, 0);
  const avgWaterLitres = Math.round((waterEntries.filter((entry) => entry.loggedAt >= now - 7 * DAY_MS).reduce((sum, entry) => sum + entry.amountMl, 0) / 7 / 1000) * 10) / 10;

  // ─── Targets ───
  const targetMacros = useMemo(() => (hasTargets ? { calories: targetCalories, proteinG: targetProteinG, carbsG: 0, fatG: 0 } : null), [hasTargets, targetCalories, targetProteinG]);
  const daysOnTargetThisMonth = useMemo(() => {
    if (!targetMacros) return null;
    let hit = 0;
    for (const [key, totals] of totalsByDateKey) {
      const [year, month, day] = key.split("-").map(Number);
      if (isSameMonth(new Date(year, month - 1, day), today) && dayGoalStatus(totals, targetMacros) === "hit") hit++;
    }
    return hit;
  }, [totalsByDateKey, targetMacros, today]);
  const daysOnTargetRecent = useMemo(() => {
    if (!targetMacros) return null;
    let hit = 0;
    for (let offset = 0; offset < 7; offset++) {
      const totals = totalsByDateKey.get(toDateKey(new Date(now - offset * DAY_MS)));
      if (totals && dayGoalStatus(totals, targetMacros) === "hit") hit++;
    }
    return hit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsByDateKey, targetMacros]);

  // ─── Consistency ───
  const currentStreak = useMemo(() => computeLoggingStreak(loggedDateKeys, today), [loggedDateKeys, today]);
  const longestStreak = useMemo(() => computeLongestLoggingStreak(loggedDateKeys), [loggedDateKeys]);
  const consistencyCells = useMemo<ConsistencyCell[]>(() => {
    const start = getCurrentWeekDates(addDays(today, -28))[0];
    const todayKey = toDateKey(today);
    return Array.from({ length: 35 }, (_, index) => {
      const date = addDays(start, index);
      const key = toDateKey(date);
      const totals = totalsByDateKey.get(key);
      const status = !totals || totals.calories === 0 ? "none" : targetMacros && dayGoalStatus(totals, targetMacros) === "hit" ? "hit" : "logged";
      return { key, status, future: key > todayKey, isToday: key === todayKey };
    });
  }, [totalsByDateKey, targetMacros, today]);

  const stats: ProgressStat[] = [
    { label: "Avg calories", value: avgCalories, unit: "kcal", color: NUTRITION_COLORS.calories, delta: percentChange(avgCalories, average(previousLogs, (entry) => entry.calories)) },
    { label: "Avg protein", value: avgProtein, unit: "g", color: NUTRITION_COLORS.protein, delta: percentChange(avgProtein, average(previousLogs, (entry) => entry.proteinG)) },
    { label: "Workouts this week", value: workoutsThisWeek, color: colors.brand.yellow },
    { label: "PRs this month", value: prsThisMonth, color: colors.brand.yellow },
    ...(daysOnTargetThisMonth !== null ? [{ label: "Days on target this month", value: daysOnTargetThisMonth, color: colors.brand.yellow }] : []),
    { label: "Water per day", value: avgWaterLitres, unit: "L", decimals: 1, color: colors.semantic.info },
  ];

  const tickerItems = [
    ...(currentStreak >= 2 ? [`${currentStreak} day streak`] : []),
    ...(avgCalories > 0 ? [`${avgCalories.toLocaleString()} kcal a day`, `${avgProtein} g protein a day`] : []),
    ...(workoutsThisWeek > 0 ? [`${workoutsThisWeek} ${workoutsThisWeek === 1 ? "workout" : "workouts"} this week`] : []),
    ...(daysOnTargetThisMonth ? [`${daysOnTargetThisMonth} days on target this month`] : []),
  ];

  const weekStart = new Date(now - 6 * DAY_MS);
  const rangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  function handleSaveGoal(displayValue: number) {
    setGoalWeightKg(weightUnit === "kg" ? displayValue : lbsToKg(displayValue));
    posthog.capture("weight_goal_set");
    setGoalSheetOpen(false);
  }

  const trendColor = weeklyTrendDisplay === null ? colors.neutral.textSecondary : weeklyTrendDisplay > 0 ? colors.semantic.success : weeklyTrendDisplay < 0 ? colors.semantic.error : colors.neutral.textSecondary;
  const goalSheetInitial = displayWeight(goalWeightKg ?? currentWeightKg ?? (weightUnit === "kg" ? 75 : 165), weightUnit);

  return (
    <View className="flex-1 bg-background">
      <NutritionPageHeader
        embedded
        title="Progress"
        subtitle="Your body and your food, over time."
        actions={<HeaderRoundButton icon="add" label="Log your weight" active onPress={() => router.push("/profile/body-log")} />}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 34 }} showsVerticalScrollIndicator={false}>
        {/* Weight hero: goal ring + current weight */}
        <View className="gap-5">
          <Animated.View entering={FadeInDown.springify().damping(16)} className="flex-row items-center gap-5">
            <CircularProgress
              progress={goalRing}
              size={128}
              strokeWidth={11}
              gap={0}
              outerCircleColor={colors.neutral.divider}
              progressCircleColor={colors.brand.yellow}
              backgroundColor="transparent"
              renderIcon={() =>
                goalPercent !== null ? (
                  <View className="items-center">
                    <View className="flex-row items-baseline">
                      <NumberFlow value={goalPercent} fontSize={30} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
                      <Text className="caption font-body-bold text-text-secondary">%</Text>
                    </View>
                    <Text className="caption text-text-secondary">to goal</Text>
                  </View>
                ) : (
                  <Ionicons name="flag-outline" size={28} color={colors.neutral.textSecondary} />
                )
              }
            />
            <View className="flex-1 gap-1">
              <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
                CURRENT WEIGHT
              </Text>
              {currentWeightKg !== null ? (
                <View className="flex-row items-baseline gap-1.5">
                  <NumberFlow value={displayWeight(currentWeightKg, weightUnit)} decimals={1} fontSize={44} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
                  <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 1, color: colors.neutral.textSecondary }}>{weightUnit.toUpperCase()}</Text>
                </View>
              ) : (
                <Pressable onPress={() => router.push("/profile/body-log")} className="mt-1 self-start rounded-full bg-brand-yellow px-4 py-2.5">
                  <Text className="body-sm font-body-semibold text-brand-iron">Log your weight</Text>
                </Pressable>
              )}
              {weeklyTrendDisplay !== null && (
                <View className="mt-0.5 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: `${trendColor}1A` }}>
                  <Ionicons name={weeklyTrendDisplay > 0 ? "trending-up" : weeklyTrendDisplay < 0 ? "trending-down" : "remove"} size={13} color={trendColor} />
                  <Text className="caption font-body-bold" style={{ color: trendColor }}>{`${weeklyTrendDisplay > 0 ? "+" : ""}${weeklyTrendDisplay} ${weightUnit}/week`}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <View className="flex-row border-y border-divider">
            <View className="flex-1 items-center gap-0.5 border-r border-divider py-3">
              <Text className="caption text-text-secondary">Starting</Text>
              <Text className="body-md font-body-semibold text-text-primary">{startingWeightKg !== null ? `${displayWeight(startingWeightKg, weightUnit)} ${weightUnit}` : "—"}</Text>
            </View>
            <View className="flex-1 items-center gap-0.5 border-r border-divider py-3">
              <Text className="caption text-text-secondary">Current</Text>
              <Text className="body-md font-body-semibold text-text-primary">{currentWeightKg !== null ? `${displayWeight(currentWeightKg, weightUnit)} ${weightUnit}` : "—"}</Text>
            </View>
            <Pressable onPress={() => setGoalSheetOpen(true)} className="flex-1 items-center gap-0.5 py-3" accessibilityLabel="Set goal weight">
              <Text className="caption text-text-secondary">Goal</Text>
              <View className="flex-row items-center gap-1">
                <Text className="body-md font-body-semibold" style={{ color: colors.brand.yellow }}>
                  {goalWeightKg !== null ? `${displayWeight(goalWeightKg, weightUnit)} ${weightUnit}` : "Set"}
                </Text>
                <Ionicons name="pencil" size={11} color={colors.brand.yellow} />
              </View>
            </Pressable>
          </View>
        </View>

        <TextTicker items={tickerItems} />

        {/* Trends */}
        <View className="gap-4">
          <SectionTitle>TRENDS</SectionTitle>
          <View className="items-start">
            <AnimatedChip.Group value={trendMetric} onValueChange={(next) => setTrendMetric(next as TrendMetric)}>
              {TREND_OPTIONS.map((option) => (
                <AnimatedChip.Item key={option.key} value={option.key} activeColor={colors.brand.yellow} inactiveColor={colors.neutral.surface}>
                  <AnimatedChip.Icon>{({ selected }) => <Image source={option.image} resizeMode="contain" style={{ width: 24, height: 24, opacity: selected ? 1 : 0.7 }} />}</AnimatedChip.Icon>
                  <AnimatedChip.Label color={colors.brand.iron} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13 }}>
                    {option.label}
                  </AnimatedChip.Label>
                </AnimatedChip.Item>
              ))}
            </AnimatedChip.Group>
          </View>

          {trendMetric === "weight" && (
            <View onLayout={(event) => setRangesWidth(event.nativeEvent.layout.width)}>
              {rangesWidth > 0 && (
                <SegmentedControl
                  currentIndex={RANGES.indexOf(range)}
                  onChange={(index) => setRange(RANGES[index])}
                  width={rangesWidth}
                  borderRadius={20}
                  paddingVertical={9}
                  segmentedControlBackgroundColor={colors.neutral.surface}
                  activeSegmentBackgroundColor={colors.brand.yellow}
                  dividerColor="transparent"
                  disableScaleEffect
                >
                  {RANGES.map((option) => (
                    <Text key={option} style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: option === range ? colors.brand.iron : colors.neutral.textSecondary }}>
                      {option}
                    </Text>
                  ))}
                </SegmentedControl>
              )}
            </View>
          )}

          {trendSeries.length >= 2 ? (
            <View className="gap-3">
              {trendLatest !== null && (
                <View className="flex-row items-baseline gap-2">
                  <NumberFlow value={trendLatest} fontSize={30} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
                  <Text className="caption font-body-semibold text-text-secondary">{trendUnit}</Text>
                  {trendDelta !== null && trendDelta !== 0 && (
                    <Text className="caption font-body-bold" style={{ color: trendMetric === "weight" ? (trendDelta > 0 ? colors.semantic.success : colors.semantic.error) : colors.neutral.textSecondary }}>
                      {`${trendDelta > 0 ? "+" : ""}${trendDelta} over this period`}
                    </Text>
                  )}
                </View>
              )}
              <TrendChart points={trendSeries} unit={trendUnit} title={TREND_OPTIONS.find((option) => option.key === trendMetric)?.label} />
            </View>
          ) : (
            <Text className="body-sm py-8 text-center text-text-secondary">{trendEmptyMessage}</Text>
          )}
        </View>

        {/* This week's numbers */}
        <View className="gap-1">
          <SectionTitle>THIS WEEK</SectionTitle>
          <ProgressStatGrid stats={stats} />
        </View>

        <DiaryWeekChart title="LAST 7 DAYS" days={last7Days} target={targetCalories} />

        {macroKcalSum > 0 && (
          <View className="gap-4">
            <SectionTitle>MACRO SPLIT</SectionTitle>
            <Animated.View entering={FadeInDown.springify().damping(16)} className="flex-row justify-around">
              <AiScanMacroRing label="PROTEIN" grams={avgProtein} kcal={macroKcal.protein} percent={percentOf(macroKcal.protein)} color={NUTRITION_COLORS.protein} />
              <AiScanMacroRing label="CARBS" grams={avgCarbs} kcal={macroKcal.carbs} percent={percentOf(macroKcal.carbs)} color={NUTRITION_COLORS.carbs} />
              <AiScanMacroRing label="FAT" grams={avgFat} kcal={macroKcal.fat} percent={percentOf(macroKcal.fat)} color={NUTRITION_COLORS.fat} />
            </Animated.View>
            <Text className="caption text-center text-text-secondary">Average per day over the last 7 days, and how much of your calories each one gives.</Text>
          </View>
        )}

        <View className="gap-4">
          <SectionTitle>CONSISTENCY</SectionTitle>
          <ProgressConsistency cells={consistencyCells} currentStreak={currentStreak} longestStreak={longestStreak} hasTargets={hasTargets} />
        </View>

        <View className="gap-4">
          <SectionTitle>YOUR WEEK</SectionTitle>
          <ProgressReceipt
            rangeLabel={rangeLabel}
            rows={[
              { label: "Avg calories", value: `${avgCalories.toLocaleString()} kcal` },
              { label: "Avg protein", value: `${avgProtein} g` },
              { label: "Days logged", value: `${daysLoggedRecent} / 7` },
              { label: "Water per day", value: `${avgWaterLitres} L` },
              { label: "Workouts", value: String(workoutsThisWeek) },
              { label: "Logging streak", value: `${currentStreak} ${currentStreak === 1 ? "day" : "days"}` },
            ]}
            totalLabel={daysOnTargetRecent !== null ? "ON TARGET" : "LOGGED"}
            totalValue={daysOnTargetRecent !== null ? `${daysOnTargetRecent} / 7 days` : `${daysLoggedRecent} / 7 days`}
            code={toDateKey(weekStart).replace(/-/g, "")}
          />
        </View>
      </ScrollView>

      <GoalWeightSheet visible={goalSheetOpen} unit={weightUnit} initialValue={goalSheetInitial} onSave={handleSaveGoal} onClose={() => setGoalSheetOpen(false)} />
    </View>
  );
}
