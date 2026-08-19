import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayWorkoutsSheet } from "@/components/DayWorkoutsSheet";
import { getMonthGrid, isSameMonth, startOfMonth, toDateKey } from "@/lib/date";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_SIZE = 34;

function DayCell({
  date,
  dayWorkouts,
  isToday,
  onPress,
}: {
  date: Date;
  dayWorkouts: CompletedWorkout[];
  isToday: boolean;
  onPress: () => void;
}) {
  const isTrained = dayWorkouts.length > 0;
  const hasPr = dayWorkouts.some((w) => w.prs.length > 0);

  return (
    <Pressable className="flex-1 items-center py-1" onPress={onPress} disabled={!isTrained} hitSlop={2}>
      <View>
        <View
          className={`items-center justify-center rounded-full ${
            isTrained ? "bg-brand-yellow" : isToday ? "border border-brand-yellow" : ""
          }`}
          style={{ width: DAY_SIZE, height: DAY_SIZE }}
        >
          <Text
            className={`body-sm ${
              isTrained ? "font-body-semibold text-brand-iron" : isToday ? "text-brand-yellow" : "text-text-primary"
            }`}
          >
            {date.getDate()}
          </Text>
        </View>

        {hasPr && (
          <View
            className="absolute items-center justify-center rounded-full bg-success"
            style={{ width: 14, height: 14, top: -3, right: -3, borderWidth: 1.5, borderColor: colors.neutral.background }}
          >
            <Ionicons name="trophy" size={8} color={colors.brand.iron} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function WorkoutHistoryRow({ workout, onPress }: { workout: CompletedWorkout; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
        <Ionicons
          name={workout.prs.length > 0 ? "trophy" : "barbell-outline"}
          size={18}
          color={workout.prs.length > 0 ? colors.brand.yellow : colors.neutral.textSecondary}
        />
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary">{workout.name}</Text>
        <Text className="caption text-text-secondary">
          {new Date(workout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
          {workout.completedSets} sets · {workout.volumeKg.toLocaleString("en-US")} {workout.unit}
          {workout.prs.length > 0 ? ` · ${workout.prs.length} PR${workout.prs.length === 1 ? "" : "s"}` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
    </Pressable>
  );
}

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, CompletedWorkout[]>();
    for (const workout of workouts) {
      const key = toDateKey(new Date(workout.completedAt));
      map.set(key, [...(map.get(key) ?? []), workout]);
    }
    return map;
  }, [workouts]);

  const weeks = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const isCurrentMonth = isSameMonth(visibleMonth, today);
  const selectedDayWorkouts = selectedDay ? (workoutsByDay.get(toDateKey(selectedDay)) ?? []) : [];

  function goToWorkout(workout: CompletedWorkout) {
    router.push({ pathname: "/workout/summary", params: { id: workout.id } });
  }

  function handlePressDay(date: Date) {
    const dayWorkouts = workoutsByDay.get(toDateKey(date)) ?? [];
    if (dayWorkouts.length === 0) return;
    if (dayWorkouts.length === 1) {
      goToWorkout(dayWorkouts[0]);
      return;
    }
    setSelectedDay(date);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="flex-row items-center gap-3 border-b border-divider px-4 pb-4 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Workout History</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3 rounded-3xl border border-divider bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
            </Pressable>
            <Text className="body-md font-body-semibold text-text-primary">
              {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
            <Pressable
              onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              hitSlop={8}
              disabled={isCurrentMonth}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textSecondary}
              />
            </Pressable>
          </View>

          <View className="flex-row justify-between">
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} className="caption flex-1 text-center text-text-secondary">
                {label}
              </Text>
            ))}
          </View>

          <View className="gap-1">
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} className="flex-row">
                {week.map((date, dayIndex) =>
                  date ? (
                    <DayCell
                      key={dayIndex}
                      date={date}
                      dayWorkouts={workoutsByDay.get(toDateKey(date)) ?? []}
                      isToday={toDateKey(date) === toDateKey(today)}
                      onPress={() => handlePressDay(date)}
                    />
                  ) : (
                    <View key={dayIndex} className="flex-1" />
                  ),
                )}
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">
            All Workouts {workouts.length > 0 ? `(${workouts.length})` : ""}
          </Text>

          {workouts.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Ionicons name="calendar-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">No workouts logged yet</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {workouts.map((workout) => (
                <WorkoutHistoryRow key={workout.id} workout={workout} onPress={() => goToWorkout(workout)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <DayWorkoutsSheet
        visible={selectedDay !== null}
        date={selectedDay}
        workouts={selectedDayWorkouts}
        onClose={() => setSelectedDay(null)}
        onSelectWorkout={(workout) => {
          setSelectedDay(null);
          goToWorkout(workout);
        }}
      />
    </View>
  );
}
