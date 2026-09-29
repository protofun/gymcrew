import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { SectionHeading } from "@/components/SectionHeading";
import { toDateKey } from "@/lib/date";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { BODY_ASPECT_RATIO } from "@/data/body-muscle-paths";
import type { MuscleGroup } from "@/data/workout-log";
import { mergeMuscleIntensity } from "@/lib/muscle-intensity";
import { preferredMuscleView } from "@/lib/muscle-groups";
import type { Gender } from "@/store/onboarding-store";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_PER_PERIOD = 14;
const CELL_HEIGHT = 62;

/** Only what this calendar actually needs — a real `CompletedWorkout` satisfies this structurally,
 * but so does a lighter adapter over another crew member's mock session data (which has no real
 * workout id to navigate to, see `interactive` below). */
export type CalendarWorkout = { id: string; completedAt: number; muscleIntensity: Partial<Record<MuscleGroup, number>> };

type DayInfo = {
  workouts: CalendarWorkout[];
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
};

function mondayOf(date: Date): Date {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7; // Monday = 0
  monday.setDate(monday.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function DayCell({
  date,
  info,
  isToday,
  interactive,
  gender,
  index,
  onPress,
}: {
  date: Date;
  info: DayInfo | undefined;
  isToday: boolean;
  interactive: boolean;
  gender: Gender;
  /** Position in the two weeks — cells come in one after another. */
  index: number;
  onPress: () => void;
}) {
  const trained = !!info && info.workouts.length > 0;
  const cellSize = { width: Math.round(CELL_HEIGHT * BODY_ASPECT_RATIO) + 6, height: CELL_HEIGHT + 6 };
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!isToday) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [isToday, pulse]);
  const todayRing = useAnimatedStyle(() => ({ opacity: 0.4 + pulse.value * 0.6 }));

  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(350)} className="flex-1">
      <Pressable className="items-center gap-1" onPress={onPress} disabled={!trained || !interactive} hitSlop={2}>
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: trained ? colors.brand.white : isToday ? colors.brand.yellow : colors.neutral.textSecondary }}>{date.getDate()}</Text>
        {/* Untrained days still render a (gray, unfilled) silhouette rather than an empty box — a
            consistent figure every day reads better than blank rest days breaking up the row. */}
        <View className="items-center justify-center rounded-2xl" style={[cellSize, { backgroundColor: trained ? "rgba(255,255,255,0.04)" : "transparent" }]}>
          {isToday ? <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 14, borderWidth: 1.5, borderColor: colors.brand.yellow }, todayRing]} /> : null}
          <MuscleHeatmap
            muscleIntensity={trained ? info.muscleIntensity : {}}
            height={CELL_HEIGHT}
            view={trained ? preferredMuscleView(info.muscleIntensity) : "front"}
            showViewLabel={false}
            showLegend={false}
            gender={gender}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Two-week, muscle-heatmap calendar: instead of a flat "trained" dot per day (the plain
 * TrainingCalendar) or a single dominant-muscle color (the previous version of this component),
 * every trained day cell renders a tiny front-body silhouette colored by exactly what was trained
 * that day — so scanning two weeks shows the actual training pattern, not just attendance.
 */
export function VisualTrainingCalendar({
  workouts,
  interactive = true,
  footerNote = "Each figure shows exactly what you trained that day",
  gender = "male",
  /** Adds the current streak next to the heading — only meaningful for the signed-in user's own history (see Home). */
  streak,
}: {
  workouts: CalendarWorkout[];
  interactive?: boolean;
  footerNote?: string;
  gender?: Gender;
  streak?: number;
}) {
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
      map.set(key, { workouts: dayWorkouts, muscleIntensity: mergeMuscleIntensity(dayWorkouts) });
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
    if (!interactive) return;
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
    <View className="gap-4">
      <SectionHeading
        id="home.calendar.headline"
        title="Calendar"
        size={28}
        eyebrow="The last two weeks"
        right={
          <View className="flex-row items-center gap-3 pb-1.5">
            {streak !== undefined && streak > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="flame" size={14} color={colors.semantic.streak} />
                <NumberFlow value={streak} fontSize={15} color={colors.brand.white} fontWeight="800" />
              </View>
            )}
            <Pressable onPress={goToPrevPeriod} hitSlop={8} accessibilityLabel="Previous two weeks">
              <Ionicons name="chevron-back" size={18} color={colors.neutral.textSecondary} />
            </Pressable>
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, width: 74, textAlign: "center", color: colors.brand.white }}>{rangeLabel}</Text>
            <Pressable onPress={goToNextPeriod} hitSlop={8} disabled={isCurrentPeriod} accessibilityLabel="Next two weeks">
              <Ionicons name="chevron-forward" size={18} color={isCurrentPeriod ? colors.neutral.divider : colors.neutral.textSecondary} />
            </Pressable>
          </View>
        }
      />

      <View className="gap-3 border-y border-divider py-4">
        <View className="flex-row justify-between">
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, flex: 1, textAlign: "center", color: colors.neutral.textSecondary }}>
              {label.toUpperCase()}
            </Text>
          ))}
        </View>

        <View className="gap-3">
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row">
              {week.map((date, dayIndex) => (
                <DayCell
                  key={dayIndex}
                  index={weekIndex * 7 + dayIndex}
                  date={date}
                  info={infoByDay.get(toDateKey(date))}
                  isToday={toDateKey(date) === toDateKey(today)}
                  interactive={interactive}
                  gender={gender}
                  onPress={() => handleDayPress(date)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <Text className="caption text-center text-text-secondary">{footerNote}</Text>
    </View>
  );
}
