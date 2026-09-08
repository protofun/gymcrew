import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NutritionCalendar } from "@/components/NutritionCalendar";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey } from "@/lib/date";
import { caloriesHistory, historyStartDateKey, proteinHistory, HISTORY_RANGES, type HistoryRange } from "@/lib/nutrition-history";
import { useBodyLogStore } from "@/store/body-log-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

// Wide enough that the calendar below can browse back a few months without hitting bare "no data"
// cells for days that were actually logged — independent of the line-chart range selector above it.
const CALENDAR_LOOKBACK_DAYS = 180;

export default function NutritionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<HistoryRange>("day");

  const entries = useNutritionLogStore((state) => state.entries);
  const fetchRange = useNutritionLogStore((state) => state.fetchRange);
  const bodyLogEntries = useBodyLogStore((state) => state.entries);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinG = useNutritionTargetsStore((state) => state.proteinG);
  const carbsG = useNutritionTargetsStore((state) => state.carbsG);
  const fatG = useNutritionTargetsStore((state) => state.fatG);

  useEffect(() => {
    fetchRange(historyStartDateKey(range), toDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    const start = toDateKey(new Date(Date.now() - CALENDAR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
    fetchRange(start, toDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calorieSeries = useMemo(() => caloriesHistory(entries, range), [entries, range]);
  const proteinSeries = useMemo(() => proteinHistory(entries, range), [entries, range]);
  const weightSeries = useMemo(
    () =>
      [...bodyLogEntries]
        .sort((a, b) => a.loggedAt - b.loggedAt)
        .map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: weightUnit === "kg" ? entry.weightKg : Math.round(entry.weightKg * 2.20462 * 10) / 10 })),
    [bodyLogEntries, weightUnit],
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/nutrition"))} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">History</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        {calories !== null && proteinG !== null && carbsG !== null && fatG !== null && (
          <NutritionCalendar entries={entries} targets={{ calories, proteinG, carbsG, fatG }} />
        )}

        <View className="flex-row rounded-full border border-divider bg-surface p-1">
          {HISTORY_RANGES.map((option) => {
            const active = option.key === range;
            return (
              <Pressable key={option.key} onPress={() => setRange(option.key)} className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}>
                <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="rounded-2xl border border-divider bg-surface p-4">
          {calorieSeries.length >= 2 ? (
            <StrengthProgressChart exerciseName="calories" points={calorieSeries} title="Calories" unit="kcal" />
          ) : (
            <Text className="body-sm py-6 text-center text-text-secondary">Not enough logged days yet to show a calorie trend.</Text>
          )}
        </View>

        <View className="rounded-2xl border border-divider bg-surface p-4">
          {proteinSeries.length >= 2 ? (
            <StrengthProgressChart exerciseName="protein" points={proteinSeries} title="Protein" unit="g" />
          ) : (
            <Text className="body-sm py-6 text-center text-text-secondary">Not enough logged days yet to show a protein trend.</Text>
          )}
        </View>

        <View className="rounded-2xl border border-divider bg-surface p-4">
          {weightSeries.length >= 2 ? (
            <StrengthProgressChart exerciseName="body weight" points={weightSeries} title="Weight" unit={weightUnit} />
          ) : (
            <Text className="body-sm py-6 text-center text-text-secondary">Log your weight a couple of times to see a trend.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
