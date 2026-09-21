import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { DiaryWeekChart } from "@/components/DiaryWeekChart";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import { HistoryTopFoods } from "@/components/HistoryTopFoods";
import { NutritionPageHeader } from "@/components/NutritionPageHeader";
import { ProgressStatGrid, type ProgressStat } from "@/components/ProgressStatGrid";
import { TrendChart } from "@/components/TrendChart";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { fromDateKey, isSameMonth, toDateKey } from "@/lib/date";
import { dayGoalStatus, dayHealthinessRatio } from "@/lib/nutrition-day-status";
import { monthlyHealthinessHistory } from "@/lib/nutrition-history";
import { sumMacros, type Macros } from "@/lib/nutrition-macros";
import { computeLongestLoggingStreak } from "@/lib/nutrition-streak";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { colors, fontFamily } from "@/theme";

// Wide enough to cover both the calendar's month-by-month browsing and the 6-month healthiness
// trend below it without hitting bare "no data" gaps for days that were actually logged.
const LOOKBACK_DAYS = 190;

function SectionTitle({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>{children}</Text>;
}

/**
 * The Nutrition section's day-by-day *record* — was I consistent? This month at a glance, a calendar of every
 * day, how on-target each month was, which weekdays you eat most on, what you log most and your records.
 * Deliberately different data from Progress (which plots raw calories/protein/weight trends).
 * Tapping a day in the calendar opens it in the diary.
 */
export function NutritionHistorySection({ onOpenDay }: { onOpenDay: (date: Date) => void }) {
  const entries = useNutritionLogStore((state) => state.entries);
  const fetchRange = useNutritionLogStore((state) => state.fetchRange);
  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const start = toDateKey(new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
    fetchRange(start, toDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targets = useMemo<Macros | null>(() => (calories !== null && proteinG !== null && carbsG !== null && fatG !== null ? { calories, proteinG, carbsG, fatG } : null), [calories, proteinG, carbsG, fatG]);

  const totalsByDateKey = useMemo(() => {
    const byDay = new Map<string, typeof entries>();
    for (const entry of entries) byDay.set(entry.dateKey, [...(byDay.get(entry.dateKey) ?? []), entry]);
    return new Map(Array.from(byDay, ([key, list]) => [key, sumMacros(list)]));
  }, [entries]);
  const loggedDateKeys = useMemo(() => new Set(Array.from(totalsByDateKey).filter(([, totals]) => totals.calories > 0).map(([key]) => key)), [totalsByDateKey]);

  // This month
  const month = useMemo(() => {
    let logged = 0;
    let hit = 0;
    let ratioSum = 0;
    for (const [key, totals] of totalsByDateKey) {
      if (totals.calories <= 0 || !isSameMonth(fromDateKey(key), today)) continue;
      logged += 1;
      if (targets) {
        if (dayGoalStatus(totals, targets) === "hit") hit += 1;
        ratioSum += dayHealthinessRatio(totals, targets);
      }
    }
    return { logged, hit, healthiness: logged > 0 && targets ? Math.round((ratioSum / logged) * 100) : null };
  }, [totalsByDateKey, targets, today]);

  const ring = useSharedValue(0);
  const ringPercent = month.logged > 0 ? (targets ? (month.hit / month.logged) * 100 : 100) : 0;
  useEffect(() => {
    ring.value = withDelay(200, withTiming(ringPercent, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [ringPercent, ring]);

  const healthinessSeries = useMemo(() => (targets ? monthlyHealthinessHistory(entries, targets) : []), [entries, targets]);

  // Average calories per weekday over everything logged — which days you eat most on.
  const weekdayAverages = useMemo(() => {
    const sums = Array(7).fill(0) as number[];
    const counts = Array(7).fill(0) as number[];
    for (const [key, totals] of totalsByDateKey) {
      if (totals.calories <= 0) continue;
      const index = (fromDateKey(key).getDay() + 6) % 7;
      sums[index] += totals.calories;
      counts[index] += 1;
    }
    return ["M", "T", "W", "T", "F", "S", "S"].map((label, index) => ({ label, calories: counts[index] > 0 ? Math.round(sums[index] / counts[index]) : 0 }));
  }, [totalsByDateKey]);

  const topFoods = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.mealId || entry.foodId?.startsWith("ai-meal:")) continue;
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  const records = useMemo<ProgressStat[]>(() => {
    let bestProtein = 0;
    for (const totals of totalsByDateKey.values()) bestProtein = Math.max(bestProtein, totals.proteinG);
    return [
      { label: "Days logged", value: loggedDateKeys.size, color: colors.brand.yellow },
      { label: "Longest streak", value: computeLongestLoggingStreak(loggedDateKeys), unit: "days", color: colors.brand.yellow },
      { label: "Best protein day", value: Math.round(bestProtein), unit: "g", color: "#00C853" },
      { label: "Items logged", value: entries.length, color: colors.neutral.textSecondary },
    ];
  }, [totalsByDateKey, loggedDateKeys, entries.length]);

  const openDay = (date: Date) => onOpenDay(date);

  return (
    <View className="flex-1">
      <NutritionPageHeader embedded title="History" subtitle="Was I consistent? Every day, on one page." />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 34 }} showsVerticalScrollIndicator={false}>
        {/* This month */}
        <Animated.View entering={FadeInDown.springify().damping(16)} className="flex-row items-center gap-5">
          <CircularProgress
            progress={ring}
            size={124}
            strokeWidth={11}
            gap={0}
            outerCircleColor={colors.neutral.divider}
            progressCircleColor={colors.brand.yellow}
            backgroundColor="transparent"
            renderIcon={() => (
              <View className="items-center">
                <NumberFlow value={targets ? month.hit : month.logged} fontSize={34} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
                <Text className="caption text-text-secondary">{targets ? "on target" : "logged"}</Text>
              </View>
            )}
          />
          <View className="flex-1 gap-1.5">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.2 }}>
              THIS MONTH
            </Text>
            <View className="flex-row items-baseline gap-1.5">
              <NumberFlow value={month.logged} fontSize={30} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
              <Text className="caption font-body-semibold text-text-secondary">days logged</Text>
            </View>
            {month.healthiness !== null && (
              <View className="flex-row items-baseline gap-1.5">
                <NumberFlow value={month.healthiness} fontSize={30} color={colors.brand.yellow} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
                <Text className="caption font-body-semibold text-text-secondary">% healthiness</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <HistoryCalendar totalsByDateKey={totalsByDateKey} targets={targets} onSelectDate={openDay} />

        <View className="gap-4">
          <SectionTitle>MONTH BY MONTH</SectionTitle>
          {healthinessSeries.length >= 2 ? (
            <TrendChart points={healthinessSeries} unit="%" title="Last 6 months" />
          ) : (
            <Text className="body-sm py-8 text-center text-text-secondary">{targets ? "Keep logging — a few more months of data will show a trend here." : "Set your targets to see how on-target each month was."}</Text>
          )}
        </View>

        <DiaryWeekChart title="BY WEEKDAY" days={weekdayAverages} target={calories} />

        {topFoods.length > 0 && (
          <View className="gap-2">
            <SectionTitle>YOU LOG THESE MOST</SectionTitle>
            <HistoryTopFoods foods={topFoods} />
          </View>
        )}

        <View className="gap-1">
          <SectionTitle>RECORDS</SectionTitle>
          <ProgressStatGrid stats={records} />
        </View>
      </ScrollView>
    </View>
  );
}
