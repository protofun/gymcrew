import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { DayWorkoutsSheet } from "@/components/DayWorkoutsSheet";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SIZE = 44;
const BADGE_SIZE = 18;

type WorkoutWeekStripProps = {
  workouts: CompletedWorkout[];
  onPressWorkout: (workout: CompletedWorkout) => void;
  onSeeAll?: () => void;
};

export function WorkoutWeekStrip({ workouts, onPressWorkout, onSeeAll }: WorkoutWeekStripProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const today = new Date();
  const weekDates = getCurrentWeekDates(today);
  const trainedCount = weekDates.filter((date) =>
    workouts.some((workout) => toDateKey(new Date(workout.completedAt)) === toDateKey(date)),
  ).length;

  const selectedDayWorkouts = selectedDay
    ? workouts.filter((workout) => toDateKey(new Date(workout.completedAt)) === toDateKey(selectedDay))
    : [];

  function handlePressDay(date: Date, dayWorkouts: CompletedWorkout[]) {
    if (dayWorkouts.length === 0) return;
    if (dayWorkouts.length === 1) {
      onPressWorkout(dayWorkouts[0]);
      return;
    }
    setSelectedDay(date);
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="body-md font-body-semibold text-text-primary">This Week</Text>
        <View className="flex-row items-center gap-3">
          <Text className="caption text-text-secondary">{trainedCount} workout{trainedCount === 1 ? "" : "s"}</Text>
          {onSeeAll && (
            <Pressable onPress={onSeeAll} hitSlop={8}>
              <Text className="caption font-body-semibold text-brand-yellow">See All</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="flex-row justify-between">
        {weekDates.map((date, index) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === toDateKey(today);
          const dayWorkouts = workouts.filter((workout) => toDateKey(new Date(workout.completedAt)) === dateKey);
          const hasWorkout = dayWorkouts.length > 0;
          const hasPr = dayWorkouts.some((w) => w.prs.length > 0);

          return (
            <Pressable
              key={dateKey}
              onPress={() => handlePressDay(date, dayWorkouts)}
              disabled={!hasWorkout}
              className="items-center gap-2"
            >
              <Text className="caption text-text-secondary">{WEEKDAY_LETTERS[index]}</Text>
              <View>
                <View
                  className={`items-center justify-center rounded-full ${
                    hasWorkout ? "bg-brand-yellow" : isToday ? "border border-brand-yellow" : "border border-divider"
                  }`}
                  style={{ width: DAY_SIZE, height: DAY_SIZE }}
                >
                  {hasWorkout ? (
                    <Ionicons name="barbell" size={18} color={colors.brand.iron} />
                  ) : (
                    <Text className={`body-sm ${isToday ? "text-brand-yellow" : "text-text-secondary"}`}>
                      {date.getDate()}
                    </Text>
                  )}
                </View>

                {hasPr && (
                  <View
                    className="absolute items-center justify-center rounded-full bg-success"
                    style={{
                      width: BADGE_SIZE,
                      height: BADGE_SIZE,
                      top: -4,
                      right: -4,
                      borderWidth: 2,
                      borderColor: colors.neutral.background,
                    }}
                  >
                    <Ionicons name="trophy" size={10} color={colors.brand.iron} />
                  </View>
                )}

                {/* More than one workout logged this day — a small count badge that opens a picker,
                    instead of silently only ever being able to open the most recent one. */}
                {dayWorkouts.length > 1 && (
                  <View
                    className="absolute items-center justify-center rounded-full bg-brand-iron"
                    style={{
                      width: BADGE_SIZE,
                      height: BADGE_SIZE,
                      bottom: -4,
                      right: -4,
                      borderWidth: 2,
                      borderColor: colors.neutral.background,
                    }}
                  >
                    <Text className="text-brand-white" style={{ fontSize: 10, fontWeight: "700" }}>
                      {dayWorkouts.length}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <DayWorkoutsSheet
        visible={selectedDay !== null}
        date={selectedDay}
        workouts={selectedDayWorkouts}
        onClose={() => setSelectedDay(null)}
        onSelectWorkout={(workout) => {
          setSelectedDay(null);
          onPressWorkout(workout);
        }}
      />
    </View>
  );
}
