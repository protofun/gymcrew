import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { DayWorkoutsSheet } from "@/components/DayWorkoutsSheet";
import { HOME_EYEBROW } from "@/components/homeStyle";
import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import { colors, fontFamily } from "@/theme";
import type { CompletedWorkout } from "@/store/workout-history-store";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function DayCell({ letter, day, isToday, selected, trained }: { letter: string; day: number; isToday: boolean; selected: boolean; trained: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!isToday) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [isToday, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));

  return (
    <View className="items-center gap-1" style={{ paddingTop: isToday ? 3 : 0 }}>
      {isToday ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: -3, left: -6, right: -6, bottom: -3, borderRadius: 16, borderWidth: 1.5, borderColor: colors.brand.yellow }, ringStyle]}
        />
      ) : null}
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>{letter}</Text>
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, color: selected ? colors.brand.iron : colors.brand.white }}>{day}</Text>
      <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: trained ? (selected ? colors.brand.iron : colors.brand.yellow) : "transparent" }} />
    </View>
  );
}

/** The week, first thing on Home — the same sliding control (Reacticx `segmented-control`) the Nutrition diary opens with, so the two
 * halves of the app read as one language, under its own "THIS WEEK" label for a bit more hierarchy at the top of the hero. Every day
 * actually responds to a tap now — the pill slides to wherever you tap, whether or not it opens anything — and a trained day opens
 * that workout: straight to it when there's only one, or a Reacticx `DayWorkoutsSheet` to pick from when there's more than one (the
 * same picker `VisualTrainingCalendar`'s own calendar and `workout/history.tsx` use). Today keeps its own soft pulsing ring so it's
 * never lost once you've tapped elsewhere. */
export function HomeWeekBar({ workouts }: { workouts: CompletedWorkout[] }) {
  const [width, setWidth] = useState(0);
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const today = new Date();
  const todayKey = toDateKey(today);
  const weekDates = getCurrentWeekDates(today);
  const todayIndex = weekDates.findIndex((date) => toDateKey(date) === todayKey);
  const [selectedIndex, setSelectedIndex] = useState(todayIndex);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, CompletedWorkout[]>();
    for (const workout of workouts) {
      const key = toDateKey(new Date(workout.completedAt));
      map.set(key, [...(map.get(key) ?? []), workout]);
    }
    return map;
  }, [workouts]);

  const pickerWorkouts = pickerDate ? (workoutsByDay.get(toDateKey(pickerDate)) ?? []) : [];

  return (
    <View className="gap-2">
      <Text style={HOME_EYEBROW}>THIS WEEK</Text>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <SegmentedControl
            currentIndex={selectedIndex}
            onChange={(index) => {
              setSelectedIndex(index);
              const date = weekDates[index];
              const dayWorkouts = workoutsByDay.get(toDateKey(date)) ?? [];
              if (dayWorkouts.length === 1) router.push(`/workout/summary?id=${dayWorkouts[0].id}`);
              else if (dayWorkouts.length > 1) setPickerDate(date);
            }}
            width={width}
            borderRadius={22}
            paddingVertical={9}
            segmentedControlBackgroundColor={colors.neutral.surface}
            activeSegmentBackgroundColor={colors.brand.yellow}
            dividerColor="transparent"
            disableScaleEffect
          >
            {weekDates.map((date, index) => {
              const key = toDateKey(date);
              return <DayCell key={key} letter={WEEKDAY_LETTERS[index]} day={date.getDate()} isToday={key === todayKey} selected={index === selectedIndex} trained={workoutsByDay.has(key)} />;
            })}
          </SegmentedControl>
        )}
      </View>

      <DayWorkoutsSheet
        visible={pickerDate !== null}
        date={pickerDate}
        workouts={pickerWorkouts}
        onClose={() => setPickerDate(null)}
        onSelectWorkout={(workout) => {
          setPickerDate(null);
          router.push(`/workout/summary?id=${workout.id}`);
        }}
      />
    </View>
  );
}
