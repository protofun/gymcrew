import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { HOME_EYEBROW, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import { formatMuscleLabel, MUSCLE_SHORT_LABEL } from "@/lib/muscle-groups";
import { sumMuscleSetCounts } from "@/lib/muscle-intensity";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type HomeMuscleBalanceProps = {
  workouts: CompletedWorkout[];
};

/** Replaces round 3's muscle-recovery rings ("de muscle status vindt ik maar een slechte") — same
 * underlying idea (an honest look at training balance) but a genuinely different chart TYPE, not
 * another ring: a real Reacticx `bar-chart` (Skia canvas — native only; `HomeMuscleBalance.web.tsx`
 * is the plain-animated-bars twin, same pattern as `DiaryWeekChart`/`.web.tsx`), one bar per muscle
 * group.
 *
 * Round 5: "de laatste card... is wel inzichtelijk maar moet nog iets hebben" — added the weakest bar
 * as its own callout with a tap-through to the Smart Split generator, the same destination
 * `TrainFocusCard`/its carousel-card successor used to point at before both were removed.
 *
 * Round 6: "data vindt ik niet goed genoeg" — this used to plot `mergeMuscleIntensity`, the SAME
 * capped-at-10 scale the heatmap uses for its color intensity. That cap is exactly right for a
 * silhouette's color (it just needs "trained a lot" vs "trained a little"), but wrong for a bar
 * chart meant to compare real weekly totals: any muscle group trained twice in a week (easily 12+
 * sets) got flattened to the same height as one trained to exactly 10 sets, so heavier weeks all
 * looked like an identical maxed-out chart — genuinely misleading, not just plainly presented. Now
 * uses `sumMuscleSetCounts`, the real uncapped completed-set total per group straight from each
 * workout's own `exercises` (the same source `computeMuscleIntensity` caps FROM, not a new metric),
 * with `maxY` sized to the actual week's numbers instead of a fixed 10 — the chart's own scale grows
 * with what really happened instead of silently clipping it. */
export function HomeMuscleBalance({ workouts }: HomeMuscleBalanceProps) {
  const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
  const setCounts = sumMuscleSetCounts(workouts.filter((workout) => !workout.isBackfilled && weekKeys.has(toDateKey(new Date(workout.completedAt)))));
  const data = ALL_MUSCLE_GROUPS.map((group) => ({ label: MUSCLE_SHORT_LABEL[group], value: setCounts[group] ?? 0 }));
  const leader = ALL_MUSCLE_GROUPS.reduce((max, group) => ((setCounts[group] ?? 0) > (setCounts[max] ?? 0) ? group : max), ALL_MUSCLE_GROUPS[0]);
  const weakest = ALL_MUSCLE_GROUPS.reduce((min, group) => ((setCounts[group] ?? 0) < (setCounts[min] ?? 0) ? group : min), ALL_MUSCLE_GROUPS[0]);
  const hasAny = data.some((entry) => entry.value > 0);
  const maxY = Math.max(10, ...data.map((entry) => entry.value)) * 1.15;
  const leaderSets = setCounts[leader] ?? 0;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={{ borderRadius: 28, backgroundColor: colors.neutral.surface, padding: 20 }} className="gap-3">
      <View className="gap-1">
        <Text style={HOME_EYEBROW}>THIS WEEK</Text>
        <Text style={[HOME_SECTION_TITLE, { fontSize: 24, lineHeight: 26 }]}>MUSCLE BALANCE</Text>
      </View>

      <BarChart.Root data={data} maxY={maxY} tickCount={3} leftInset={0} style={{ height: 150 }}>
        <BarChart.Grid color={colors.neutral.divider} />
        <BarChart.Highlight color="rgba(255,255,255,0.05)" />
        <BarChart.Bars color={colors.neutral.surfaceElevated} activeColor={colors.brand.yellow} radius={6} />
        <BarChart.XAxis style={{ color: colors.neutral.textSecondary, fontSize: 9 }} activeStyle={{ color: colors.brand.white, fontSize: 9 }} />
      </BarChart.Root>

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
