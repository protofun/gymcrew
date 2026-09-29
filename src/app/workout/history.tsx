import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { DayWorkoutsSheet } from "@/components/DayWorkoutsSheet";
import { HOME_EYEBROW } from "@/components/homeStyle";
import { SectionHeading } from "@/components/SectionHeading";
import { ShareCardModal } from "@/components/ShareCardModal";
import { WorkoutListRow } from "@/components/WorkoutListRow";
import { WorkoutShareCard } from "@/components/WorkoutShareCard";
import { getMonthGrid, isSameMonth, startOfMonth, toDateKey } from "@/lib/date";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_SIZE = 36;

/** Same pulsing-ring-on-today language `VisualTrainingCalendar` (Home's own 2-week calendar) already
 * uses — this month view is the same calendar system at a different scale, not a separate design. */
function DayCell({
  date,
  dayWorkouts,
  isToday,
  index,
  onPress,
}: {
  date: Date;
  dayWorkouts: CompletedWorkout[];
  isToday: boolean;
  index: number;
  onPress: () => void;
}) {
  const isTrained = dayWorkouts.length > 0;
  const hasPr = dayWorkouts.some((w) => w.prs.length > 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!isToday) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [isToday, pulse]);
  const todayRing = useAnimatedStyle(() => ({ opacity: 0.4 + pulse.value * 0.6 }));

  return (
    <Animated.View entering={FadeIn.delay(index * 12).duration(300)} className="flex-1 items-center py-1">
      <Pressable onPress={onPress} disabled={!isTrained} hitSlop={2}>
        <View>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: DAY_SIZE, height: DAY_SIZE, backgroundColor: isTrained ? colors.brand.yellow : "transparent" }}
          >
            {isToday && !isTrained ? (
              <Animated.View
                pointerEvents="none"
                style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: DAY_SIZE / 2, borderWidth: 1.5, borderColor: colors.brand.yellow }, todayRing]}
              />
            ) : null}
            <Text style={{ fontFamily: isTrained ? fontFamily.bodyBold : fontFamily.bodySemiBold, fontSize: 14, color: isTrained ? colors.brand.iron : isToday ? colors.brand.yellow : colors.brand.white }}>
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
    </Animated.View>
  );
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [sharingWorkout, setSharingWorkout] = useState<CompletedWorkout | null>(null);

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
        <Pressable onPress={() => goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Workout History</Text>
      </View>

      {/* `style`, not `className`, for the same reason workout/summary.tsx's ScrollView uses one —
          `flex-1` as a className is unreliable on native with this project's NativeWind preview
          version, and a ScrollView that silently doesn't get constrained to the remaining space
          reads as its header scrolling away with everything else. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 20, padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          <SectionHeading
            id="workout.history.calendarHeadline"
            title={visibleMonth.toLocaleDateString("en-US", { month: "long" })}
            eyebrow={visibleMonth.toLocaleDateString("en-US", { year: "numeric" })}
            size={28}
            right={
              <View className="flex-row items-center gap-3 pb-1.5">
                <Pressable
                  onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  hitSlop={8}
                  accessibilityLabel="Previous month"
                >
                  <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  hitSlop={8}
                  disabled={isCurrentMonth}
                  accessibilityLabel="Next month"
                >
                  <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textSecondary} />
                </Pressable>
              </View>
            }
          />

          <View className="gap-3 border-y border-divider py-4">
            <View className="flex-row justify-between">
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[HOME_EYEBROW, { flex: 1, textAlign: "center" }]}>
                  {label.toUpperCase()}
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
                        index={weekIndex * 7 + dayIndex}
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
        </View>

        <View className="gap-3">
          <Text style={HOME_EYEBROW}>ALL WORKOUTS {workouts.length > 0 ? `(${workouts.length})` : ""}</Text>

          {workouts.length === 0 ? (
            <View className="items-center gap-2 py-14">
              <Ionicons name="calendar-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">No workouts logged yet</Text>
            </View>
          ) : (
            <View>
              {workouts.map((workout, index) => (
                <WorkoutListRow
                  key={workout.id}
                  name={workout.name}
                  dateLabel={new Date(workout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  detail={`${workout.completedSets} sets · ${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}${workout.prs.length > 0 ? ` · ${workout.prs.length} PR${workout.prs.length === 1 ? "" : "s"}` : ""}`}
                  hasPr={workout.prs.length > 0}
                  isLast={index === workouts.length - 1}
                  onPress={() => goToWorkout(workout)}
                  onShare={() => setSharingWorkout(workout)}
                />
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

      <ShareCardModal
        visible={sharingWorkout !== null}
        onClose={() => setSharingWorkout(null)}
        fallbackMessage={
          sharingWorkout
            ? `${sharingWorkout.name} — ${formatDuration(sharingWorkout.durationSeconds)}, ${sharingWorkout.volumeKg.toLocaleString("en-US")} ${sharingWorkout.unit} lifted across ${sharingWorkout.completedSets} sets on GymCrew.`
            : ""
        }
      >
        {sharingWorkout && <WorkoutShareCard workout={sharingWorkout} gender={gender} />}
      </ShareCardModal>
    </View>
  );
}
