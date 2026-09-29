import { useState } from "react";
import { Text, View } from "react-native";

import { ExerciseComparisonChart, type ComparisonPoint } from "@/components/ExerciseComparisonChart";
import { MetricTrendChart, type TrendPoint } from "@/components/MetricTrendChart";
import { PillRow } from "@/components/PillRow";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { formatMuscleName } from "@/data/exercises";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { displayWeight } from "@/lib/units";
import { findPreviousMatchingWorkout } from "@/lib/workout-comparison";
import { estimateCalories } from "@/lib/workout-sessions";
import type { LoggedExercise } from "@/store/active-workout-store";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type StatsTabKey = "volume" | "exercises" | "sets" | "muscles" | "duration" | "calories";

const TABS = [
  { key: "volume", label: "Volume" },
  { key: "exercises", label: "Exercises" },
  { key: "sets", label: "Sets" },
  { key: "muscles", label: "Muscles" },
  { key: "duration", label: "Duration" },
  { key: "calories", label: "Calories" },
] as const;

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
          <AnimatedProgressBar progress={Math.max(0.04, row.value / maxValue)} height={8} borderRadius={4} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={800} />
        </View>
      ))}
    </View>
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
  // Every underlying volume number is stored in kg regardless of which unit was active when that
  // particular workout was logged — always convert to the user's *current* display preference here,
  // not each workout's own historical `unit`, so a multi-workout trend never mixes units.
  const weightUnit = useWeightUnit();

  // No slice here — `MetricTrendChart` itself caps how many it draws (and scrolls horizontally
  // for the rest), so this just hands over everything available.
  function trendPoints(getValue: (w: CompletedWorkout) => number): TrendPoint[] {
    return workouts.map((w) => ({ id: w.id, value: getValue(w), dateMs: w.completedAt, isCurrent: w.id === workout.id }));
  }

  const exerciseRows: BreakdownRow[] = workout.exercises
    .map((exercise) => ({ id: exercise.exerciseId, label: exercise.name, value: displayWeight(exerciseVolume(exercise), weightUnit) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const previousWorkout = findPreviousMatchingWorkout(workouts, workout);
  const comparisonPoints: ComparisonPoint[] = exerciseRows.map((row) => {
    const previousExercise = previousWorkout?.exercises.find((exercise) => exercise.exerciseId === row.id);
    return {
      id: row.id,
      label: row.label,
      current: row.value,
      previous: previousExercise ? displayWeight(exerciseVolume(previousExercise), weightUnit) : null,
    };
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
    .map(([muscle, value]) => ({ id: muscle, label: formatMuscleName(muscle), value: displayWeight(value, weightUnit) }))
    .sort((a, b) => b.value - a.value);

  return (
    <View className="gap-4">
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>YOUR STATS</Text>

      {/* One row of chips to slide between the six cuts of the same data (Reacticx `animated-chip`), instead of a dropdown that hides them. */}
      <PillRow options={TABS} value={tab} onChange={setTab} />

      {tab === "volume" && (
        <MetricTrendChart
          // Pre-converted by `trendPoints` — `formatValue` just labels it, so this must NOT run
          // the value through `displayWeight`/`formatWeight` again (that would double-convert).
          points={trendPoints((w) => displayWeight(w.volumeKg, weightUnit))}
          formatValue={(value) => `${value.toLocaleString("en-US")} ${weightUnit}`}
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
        <BreakdownBars rows={muscleRows} unit={weightUnit} emptyLabel="No muscle data for this workout." />
      )}
    </View>
  );
}
