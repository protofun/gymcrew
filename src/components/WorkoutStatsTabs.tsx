import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseComparisonChart, type ComparisonPoint } from "@/components/ExerciseComparisonChart";
import { MetricTrendChart, type TrendPoint } from "@/components/MetricTrendChart";
import { formatMuscleName } from "@/data/exercises";
import { findPreviousMatchingWorkout } from "@/lib/workout-comparison";
import { estimateCalories } from "@/lib/workout-sessions";
import type { LoggedExercise } from "@/store/active-workout-store";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

type StatsTabKey = "volume" | "exercises" | "sets" | "muscles" | "duration" | "calories";

const TABS: { key: StatsTabKey; label: string }[] = [
  { key: "volume", label: "Volume" },
  { key: "exercises", label: "Exercises" },
  { key: "sets", label: "Sets" },
  { key: "muscles", label: "Muscles" },
  { key: "duration", label: "Duration" },
  { key: "calories", label: "Calories" },
];

function exerciseVolume(exercise: LoggedExercise): number {
  return exercise.sets.filter((set) => set.completed).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
}

type BreakdownRow = { id: string; label: string; value: number };

function BreakdownBars({ rows, unit, emptyLabel }: { rows: BreakdownRow[]; unit: string; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="body-sm text-text-secondary">{emptyLabel}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...rows.map((row) => row.value));

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.id} className="gap-1">
          <View className="flex-row items-baseline justify-between">
            <Text className="body-sm text-text-primary" numberOfLines={1}>
              {row.label}
            </Text>
            <Text className="caption text-text-secondary">
              {row.value.toLocaleString("en-US")} {unit}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-background">
            <View className="h-2 rounded-full bg-brand-yellow" style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

type MetricPickerSheetProps = {
  visible: boolean;
  tab: StatsTabKey;
  onChange: (key: StatsTabKey) => void;
  onClose: () => void;
};

/** Same bottom-sheet pattern as the Ranks tab's "Sort lifts by" menu (`SortMenu` in
 * `(tabs)/ranks.tsx`) — a plain tap-to-pick list, no text input involved, so there's no risk of the
 * keyboard popping up over it. */
function MetricPickerSheet({ visible, tab, onChange, onClose }: MetricPickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        {/* Swallows taps so they don't bubble to the backdrop Pressable and close the sheet. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).mass(0.7)}
            style={{ paddingBottom: insets.bottom + 16 }}
            className="gap-1 rounded-t-3xl border-t border-divider bg-surface p-4"
          >
            <Text className="heading-4 mb-2 text-text-primary">View by</Text>
            {TABS.map((option) => {
              const active = option.key === tab;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onChange(option.key);
                    onClose();
                  }}
                  className="flex-row items-center justify-between rounded-xl px-2 py-3"
                >
                  <Text className={active ? "body-md font-body-semibold text-brand-yellow" : "body-md text-text-primary"}>{option.label}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type WorkoutStatsTabsProps = {
  workout: CompletedWorkout;
  /** Full history, newest first (as stored) — used for the four trend tabs. */
  workouts: CompletedWorkout[];
  bodyWeightKg: number;
};

/** Volume Trend and Volume by Exercise used to be two separately-scrolled sections — folded into
 * one explorer (6 cuts of the same underlying data) picked via a dropdown, so there's one place to
 * "tap around" instead of two fixed charts taking up a long scroll regardless of which one you
 * care about. */
export function WorkoutStatsTabs({ workout, workouts, bodyWeightKg }: WorkoutStatsTabsProps) {
  const [tab, setTab] = useState<StatsTabKey>("volume");
  const [pickerOpen, setPickerOpen] = useState(false);
  const tabLabel = TABS.find((option) => option.key === tab)?.label ?? "Volume";

  // No slice here — `MetricTrendChart` itself caps how many it draws (and scrolls horizontally
  // for the rest), so this just hands over everything available.
  function trendPoints(getValue: (w: CompletedWorkout) => number): TrendPoint[] {
    return workouts.map((w) => ({ id: w.id, value: getValue(w), dateMs: w.completedAt, isCurrent: w.id === workout.id }));
  }

  const exerciseRows: BreakdownRow[] = workout.exercises
    .map((exercise) => ({ id: exercise.exerciseId, label: exercise.name, value: exerciseVolume(exercise) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const previousWorkout = findPreviousMatchingWorkout(workouts, workout);
  const comparisonPoints: ComparisonPoint[] = exerciseRows.map((row) => {
    const previousExercise = previousWorkout?.exercises.find((exercise) => exercise.exerciseId === row.id);
    return { id: row.id, label: row.label, current: row.value, previous: previousExercise ? exerciseVolume(previousExercise) : null };
  });
  const previousLabel = previousWorkout
    ? `Last time (${new Date(previousWorkout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
    : "Last time";

  const muscleRows: BreakdownRow[] = Object.entries(
    workout.exercises.reduce<Record<string, number>>((totals, exercise) => {
      const volume = exerciseVolume(exercise);
      if (volume <= 0) return totals;
      totals[exercise.primaryMuscle] = (totals[exercise.primaryMuscle] ?? 0) + volume;
      return totals;
    }, {}),
  )
    .map(([muscle, value]) => ({ id: muscle, label: formatMuscleName(muscle), value }))
    .sort((a, b) => b.value - a.value);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="body-md font-body-semibold text-text-primary">Your Stats</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5"
        >
          <Text className="caption font-body-semibold text-text-secondary">{tabLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <MetricPickerSheet visible={pickerOpen} tab={tab} onChange={setTab} onClose={() => setPickerOpen(false)} />

      {tab === "volume" && (
        <MetricTrendChart
          points={trendPoints((w) => w.volumeKg)}
          formatValue={(value) => `${value.toLocaleString("en-US")}${workout.unit}`}
          emptyLabel="Log a few more workouts to see your volume trend here."
        />
      )}
      {tab === "sets" && (
        <MetricTrendChart
          points={trendPoints((w) => w.completedSets)}
          formatValue={(value) => String(value)}
          emptyLabel="Log a few more workouts to see your sets trend here."
        />
      )}
      {tab === "duration" && (
        <MetricTrendChart
          points={trendPoints((w) => Math.round(w.durationSeconds / 60))}
          formatValue={(value) => `${value}m`}
          emptyLabel="Log a few more workouts to see your duration trend here."
        />
      )}
      {tab === "calories" && (
        <MetricTrendChart
          points={trendPoints((w) => estimateCalories(Math.round(w.durationSeconds / 60), bodyWeightKg))}
          formatValue={(value) => `~${value}`}
          emptyLabel="Log a few more workouts to see your calories trend here."
        />
      )}
      {tab === "exercises" && (
        <ExerciseComparisonChart
          points={comparisonPoints}
          previousLabel={previousLabel}
          emptyLabel="No exercise volume logged for this workout."
        />
      )}
      {tab === "muscles" && (
        <BreakdownBars rows={muscleRows} unit={workout.unit} emptyLabel="No muscle data for this workout." />
      )}
    </View>
  );
}
