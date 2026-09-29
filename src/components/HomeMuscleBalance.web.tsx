import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { HOME_EYEBROW, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import { formatMuscleLabel, MUSCLE_SHORT_LABEL } from "@/lib/muscle-groups";
import { sumMuscleSetCounts } from "@/lib/muscle-intensity";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type HomeMuscleBalanceProps = {
  workouts: CompletedWorkout[];
};

const CHART_HEIGHT = 130;

function Bar({ index, value, maxY, label }: { index: number; value: number; maxY: number; label: string }) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(index * 50, withTiming(value / maxY, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [index, value, maxY, grow]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(grow.value * CHART_HEIGHT, 2) }));

  return (
    <View className="flex-1 items-center gap-1.5">
      <View style={{ height: CHART_HEIGHT }} className="justify-end">
        <Animated.View style={[{ width: 14, borderRadius: 6, backgroundColor: value > 0 ? colors.brand.yellow : colors.neutral.surfaceElevated }, barStyle]} />
      </View>
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 9, color: colors.neutral.textSecondary }}>{label}</Text>
    </View>
  );
}

/** Web version of HomeMuscleBalance — the same bars, drawn with plain animated views instead of
 * the Skia canvas of Reacticx's bar-chart. See HomeMuscleBalance.tsx's own comment for why this
 * plots real uncapped `sumMuscleSetCounts` now instead of the heatmap's capped-at-10 intensity. */
export function HomeMuscleBalance({ workouts }: HomeMuscleBalanceProps) {
  const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
  const setCounts = sumMuscleSetCounts(workouts.filter((workout) => !workout.isBackfilled && weekKeys.has(toDateKey(new Date(workout.completedAt)))));
  const leader = ALL_MUSCLE_GROUPS.reduce((max, group) => ((setCounts[group] ?? 0) > (setCounts[max] ?? 0) ? group : max), ALL_MUSCLE_GROUPS[0]);
  const weakest = ALL_MUSCLE_GROUPS.reduce((min, group) => ((setCounts[group] ?? 0) < (setCounts[min] ?? 0) ? group : min), ALL_MUSCLE_GROUPS[0]);
  const hasAny = ALL_MUSCLE_GROUPS.some((group) => (setCounts[group] ?? 0) > 0);
  const maxY = Math.max(10, ...ALL_MUSCLE_GROUPS.map((group) => setCounts[group] ?? 0));
  const leaderSets = setCounts[leader] ?? 0;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ borderRadius: 28, backgroundColor: colors.neutral.surface, padding: 20 }} className="gap-3">
      <View className="gap-1">
        <Text style={HOME_EYEBROW}>THIS WEEK</Text>
        <Text style={[HOME_SECTION_TITLE, { fontSize: 24, lineHeight: 26 }]}>MUSCLE BALANCE</Text>
      </View>

      <View className="flex-row">
        {ALL_MUSCLE_GROUPS.map((group, index) => (
          <Bar key={group} index={index} value={setCounts[group] ?? 0} maxY={maxY} label={MUSCLE_SHORT_LABEL[group]} />
        ))}
      </View>

      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>
        {hasAny ? `${formatMuscleLabel(leader)} led the week · ${leaderSets} set${leaderSets === 1 ? "" : "s"}` : "Log a workout to see your split"}
      </Text>

      {hasAny && (
        <Pressable onPress={() => router.push("/workout-split/intro")} className="flex-row items-center justify-between border-t border-divider pt-3">
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>{`${formatMuscleLabel(weakest)} could use more work`}</Text>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 13, letterSpacing: 1, color: colors.brand.yellow }}>BUILD A SPLIT ›</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
