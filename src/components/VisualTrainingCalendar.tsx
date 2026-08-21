import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { toDateKey } from "@/lib/date";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import type { MuscleGroup } from "@/data/workout-log";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_PER_PERIOD = 14;
const CELL_HEIGHT = 62;

type DayInfo = {
  workouts: CompletedWorkout[];
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
};

function mondayOf(date: Date): Date {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7; // Monday = 0
  monday.setDate(monday.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function mergeIntensity(workouts: CompletedWorkout[]): Partial<Record<MuscleGroup, number>> {
  const merged: Partial<Record<MuscleGroup, number>> = {};
  for (const workout of workouts) {
    for (const [group, value] of Object.entries(workout.muscleIntensity) as [MuscleGroup, number][]) {
      merged[group] = Math.min(10, (merged[group] ?? 0) + value);
    }
  }
  return merged;
}

function DayCell({ date, info, isToday, onPress }: { date: Date; info: DayInfo | undefined; isToday: boolean; onPress: () => void }) {
  const trained = !!info && info.workouts.length > 0;

  return (
    <Pressable className="flex-1 items-center gap-1" onPress={onPress} disabled={!trained} hitSlop={2}>
      <Text className={`caption ${trained ? "font-body-bold text-text-primary" : isToday ? "font-body-bold text-brand-yellow" : "text-text-secondary"}`}>
        {date.getDate()}
      </Text>
      {trained ? (
        <MuscleHeatmap muscleIntensity={info.muscleIntensity} height={CELL_HEIGHT} view="front" showViewLabel={false} showLegend={false} />
      ) : (
        <View
          className={`items-center justify-center rounded-lg ${isToday ? "border border-brand-yellow" : "border border-divider"}`}
          style={{ width: Math.round(CELL_HEIGHT * (35 / 93)), height: CELL_HEIGHT }}
        >
          {isToday && <Ionicons name="ellipse" size={5} color={colors.brand.yellow} />}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Two-week, muscle-heatmap calendar: instead of a flat "trained" dot per day (the plain
 * TrainingCalendar) or a single dominant-muscle color (the previous version of this component),
 * every trained day cell renders a tiny front-body silhouette colored by exactly what was trained
 * that day — so scanning two weeks shows the actual training pattern, not just attendance.
 */
export function VisualTrainingCalendar({ workouts }: { workouts: CompletedWorkout[] }) {
  const today = new Date();
  // Deliberately computed once at mount, not on every re-render as `today` ticks over — the default
  // 2-week window shouldn't shift under the user mid-session just because the clock rolled past midnight.
  const defaultPeriodStart = useMemo(() => {
    const start = mondayOf(today);
    start.setDate(start.getDate() - 7); // last complete week + the current one
    return start;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);

  const days = useMemo(
    () => Array.from({ length: DAYS_PER_PERIOD }, (_, i) => new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + i)),
    [periodStart],
  );
  const weeks = [days.slice(0, 7), days.slice(7, 14)];
  const isCurrentPeriod = toDateKey(periodStart) === toDateKey(defaultPeriodStart);

  const infoByDay = useMemo(() => {
    const map = new Map<string, DayInfo>();
    for (const workout of workouts) {
      const key = toDateKey(new Date(workout.completedAt));
      const dayWorkouts = [...(map.get(key)?.workouts ?? []), workout];
      map.set(key, { workouts: dayWorkouts, muscleIntensity: mergeIntensity(dayWorkouts) });
    }
    return map;
  }, [workouts]);

  function goToPrevPeriod() {
    setPeriodStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - DAYS_PER_PERIOD));
  }
  function goToNextPeriod() {
    setPeriodStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + DAYS_PER_PERIOD));
  }

  function handleDayPress(date: Date) {
    const info = infoByDay.get(toDateKey(date));
    const workout = info?.workouts[0];
    if (workout) router.push(`/workout/summary?id=${workout.id}`);
  }

  const periodEnd = days[days.length - 1];
  const sameMonth = periodStart.getMonth() === periodEnd.getMonth();
  const rangeLabel = sameMonth
    ? `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString("en-US", { day: "numeric" })}`
    : `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <View className="gap-3 rounded-3xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text className="heading-4 text-text-primary" numberOfLines={1}>
          Training Calendar
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={goToPrevPeriod} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
          <Text className="caption w-20 text-center font-body-semibold text-text-primary">{rangeLabel}</Text>
          <Pressable onPress={goToNextPeriod} hitSlop={8} disabled={isCurrentPeriod}>
            <Ionicons name="chevron-forward" size={18} color={isCurrentPeriod ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View className="flex-row justify-between">
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} className="caption flex-1 text-center text-text-secondary">
            {label}
          </Text>
        ))}
      </View>

      <View className="gap-3">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row">
            {week.map((date, dayIndex) => (
              <DayCell
                key={dayIndex}
                date={date}
                info={infoByDay.get(toDateKey(date))}
                isToday={toDateKey(date) === toDateKey(today)}
                onPress={() => handleDayPress(date)}
              />
            ))}
          </View>
        ))}
      </View>

      <Text className="caption text-center text-text-secondary">Each figure shows exactly what you trained that day</Text>
    </View>
  );
}
