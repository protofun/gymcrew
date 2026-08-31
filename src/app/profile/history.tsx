import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EditableText } from "@/components/EditableText";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { StatTile } from "@/components/StatTile";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { VisualTrainingCalendar } from "@/components/VisualTrainingCalendar";
import { fromDateKey, getCurrentWeekDates, toDateKey } from "@/lib/date";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { computeCurrentStreak, computeLongestStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { kgToLbs } from "@/lib/units";
import { bestWeek, CHART_METRICS, muscleTrainingBreakdown, weeklyMetricSeries, workoutTotals, type ChartMetric } from "@/lib/workout-charts";
import type { WeightUnit } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

function formatWeight(kg: number, unit: WeightUnit): string {
  return unit === "kg" ? `${Math.round(kg).toLocaleString("en-US")} kg` : `${Math.round(kgToLbs(kg)).toLocaleString("en-US")} lbs`;
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const RECENT_WORKOUTS_LIMIT = 5;

const CHART_WEEKS = 10;
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export default function TrainingHistoryScreen() {
  const insets = useSafeAreaInsets();
  const allWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);
  const [metric, setMetric] = useState<ChartMetric>("volume");

  // In snapshot mode, everything below is scoped to workouts up to the viewed date — same "as of
  // that moment" rule every other snapshot-aware screen follows.
  const workouts = useMemo(
    () => (snapshotAsOfMs != null ? allWorkouts.filter((workout) => workout.completedAt <= snapshotAsOfMs) : allWorkouts),
    [allWorkouts, snapshotAsOfMs],
  );
  const referenceDate = useMemo(() => (snapshotAsOfMs != null ? new Date(snapshotAsOfMs) : new Date()), [snapshotAsOfMs]);

  const currentStreak = computeCurrentStreak(workouts, referenceDate);
  const longestStreak = computeLongestStreak(workouts);
  const trainedThisWeek = computeTrainedDaysThisWeek(workouts, referenceDate);
  const today = toDateKey(referenceDate);
  const weekDates = getCurrentWeekDates(referenceDate);

  const activeMetric = CHART_METRICS.find((option) => option.key === metric) ?? CHART_METRICS[0];
  const series = useMemo(() => weeklyMetricSeries(workouts, metric, CHART_WEEKS, referenceDate), [workouts, metric, referenceDate]);

  const totals = useMemo(() => workoutTotals(workouts), [workouts]);
  const { most, least } = useMemo(() => muscleTrainingBreakdown(workouts), [workouts]);
  const best = useMemo(() => bestWeek(workouts), [workouts]);
  const recentWorkouts = workouts.slice(0, RECENT_WORKOUTS_LIMIT);

  function goToWorkout(workout: CompletedWorkout) {
    router.push({ pathname: "/workout/summary", params: { id: workout.id } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Training History</Text>
      </View>

      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-3">
          <StatTile id="profile.history.currentStreak" icon="flame" label="Current Streak" value={`${currentStreak}d`} />
          <StatTile id="profile.history.longestStreak" icon="trophy" label="Longest Streak" value={`${longestStreak}d`} />
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface p-4">
          {weekDates.map((date, index) => {
            const trained = trainedThisWeek[index];
            const isToday = toDateKey(date) === today;
            return (
              <View key={index} className="items-center gap-1.5">
                <Text className="caption text-text-secondary">{WEEKDAY_INITIALS[index]}</Text>
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${trained ? "bg-brand-yellow" : isToday ? "border border-brand-yellow" : "border border-divider"}`}
                >
                  {trained && <Ionicons name="flame" size={14} color={colors.brand.iron} />}
                </View>
              </View>
            );
          })}
        </View>

        <VisualTrainingCalendar workouts={workouts} gender={gender} />

        <View className="gap-3">
          <Text className="heading-4 text-text-primary">Performance</Text>
          <View className="flex-row rounded-full border border-divider bg-surface p-1">
            {CHART_METRICS.map((option) => {
              const active = option.key === metric;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setMetric(option.key)}
                  className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
                >
                  <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="rounded-2xl border border-divider bg-surface p-4">
            <StrengthProgressChart
              exerciseName={activeMetric.label}
              points={series}
              title={`${activeMetric.label} per week`}
              unit={activeMetric.unit}
            />
          </View>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="All-Time Totals" />
          <StatCard>
            <StatRow id="profile.history.totalWorkouts" label="Total Workouts" value={String(totals.workouts)} />
            <StatRow id="profile.history.totalSets" label="Total Sets" value={totals.sets.toLocaleString("en-US")} />
            <StatRow id="profile.history.totalReps" label="Total Reps" value={totals.reps.toLocaleString("en-US")} />
            <StatRow id="profile.history.totalVolume" label="Total Volume" value={formatWeight(totals.volumeKg, weightUnit)} />
            <StatRow id="profile.history.totalTime" label="Total Training Time" value={formatDuration(totals.durationSeconds)} />
            <StatRow id="profile.history.avgDuration" label="Avg Workout Duration" value={formatDuration(totals.avgDurationSeconds)} isLast />
          </StatCard>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="Muscle Balance" />
          <StatCard>
            <StatRow
              id="profile.history.mostTrained"
              label="Most Trained"
              value={most ? formatMuscleLabel(most) : "—"}
              valueColor={most ? colors.semantic.success : undefined}
            />
            <StatRow
              id="profile.history.leastTrained"
              label="Least Trained"
              value={least ? formatMuscleLabel(least) : "—"}
              valueColor={least ? colors.semantic.error : undefined}
            />
            <StatRow
              id="profile.history.bestWeek"
              label="Best Week (Volume)"
              value={best ? `${fromDateKey(best.weekKey).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${formatWeight(best.volumeKg, weightUnit)}` : "—"}
              isLast
            />
          </StatCard>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Recent Workouts</Text>
            <Pressable onPress={() => router.push("/workout/history")} hitSlop={8}>
              <Text className="body-sm font-body-semibold text-brand-yellow">See all</Text>
            </Pressable>
          </View>

          {recentWorkouts.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Ionicons name="calendar-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">No workouts logged yet.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {recentWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => goToWorkout(workout)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                    <Ionicons
                      name={workout.prs.length > 0 ? "trophy" : "barbell-outline"}
                      size={18}
                      color={workout.prs.length > 0 ? colors.brand.yellow : colors.neutral.textSecondary}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <EditableText id={`profile.history.workout.${workout.id}.name`} className="body-md font-body-semibold text-text-primary">
                      {workout.name}
                    </EditableText>
                    <EditableText id={`profile.history.workout.${workout.id}.detail`} className="caption text-text-secondary">
                      {`${new Date(workout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${workout.completedSets} sets · ${formatWeight(workout.volumeKg, weightUnit)}${workout.prs.length > 0 ? ` · ${workout.prs.length} PR${workout.prs.length === 1 ? "" : "s"}` : ""}`}
                    </EditableText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
