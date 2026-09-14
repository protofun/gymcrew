import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NutritionCalendar } from "@/components/NutritionCalendar";
import { NutritionNavBar } from "@/components/NutritionNavBar";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey } from "@/lib/date";
import { monthlyHealthinessHistory } from "@/lib/nutrition-history";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { colors } from "@/theme";

// Wide enough to cover both the calendar's month-by-month browsing and the 6-month healthiness
// trend below it without hitting bare "no data" gaps for days that were actually logged.
const LOOKBACK_DAYS = 190;

/**
 * The Nutrition tab's day-by-day *record* — the habit-tracker calendar plus how consistently on
 * target each month actually was. Deliberately different data from Progress (which plots raw
 * calories/protein/weight trends): History answers "was I consistent", Progress answers "what did I
 * actually eat/weigh" — showing the same three line charts on both screens was just noise twice over.
 */
export default function NutritionHistoryScreen() {
  const insets = useSafeAreaInsets();

  const entries = useNutritionLogStore((state) => state.entries);
  const fetchRange = useNutritionLogStore((state) => state.fetchRange);
  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);

  useEffect(() => {
    const start = toDateKey(new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
    fetchRange(start, toDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasTargets = calories !== null && proteinG !== null && carbsG !== null && fatG !== null;
  const targets = useMemo(
    () => (hasTargets ? { calories, proteinG, carbsG, fatG } : null),
    [hasTargets, calories, proteinG, carbsG, fatG],
  );

  const healthinessSeries = useMemo(() => (targets ? monthlyHealthinessHistory(entries, targets) : []), [entries, targets]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">History</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 20 }} showsVerticalScrollIndicator={false}>
        {targets && <NutritionCalendar entries={entries} targets={targets} />}

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Monthly Healthiness</Text>
          <View className="rounded-2xl border border-divider bg-surface p-4">
            {healthinessSeries.length >= 2 ? (
              <StrengthProgressChart exerciseName="on-target days" points={healthinessSeries} title="Last 6 Months" unit="%" />
            ) : (
              <Text className="body-sm py-6 text-center text-text-secondary">Keep logging — a few more months of data will show a trend here.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <NutritionNavBar active="history" dateKey={toDateKey(new Date())} />
    </View>
  );
}
