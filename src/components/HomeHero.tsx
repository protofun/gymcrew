import { Text, View } from "react-native";

import { HOME_EYEBROW, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { HomeWeekBar } from "@/components/HomeWeekBar";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RadarChart, type RadarAxisDatum } from "@/components/RadarChart";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import { sumMuscleSetCounts } from "@/lib/muscle-intensity";
import { MUSCLE_SHORT_LABEL } from "@/lib/muscle-groups";
import { colors, fontFamily } from "@/theme";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** Sets-per-muscle-group this week, the same baseline weekly scale `HomeMuscleBalance`'s own bar
 * chart and `intensityToColor`'s heatmap scale already treat as "well trained" — reusing an existing
 * app-wide convention for "enough," not inventing a new number. */
const MUSCLE_TARGET_SETS = 10;

type HomeHeroProps = {
  name: string;
  workouts: CompletedWorkout[];
  streak: number;
  onPressStartWorkout?: () => void;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The top of Home — a real hero section now, not just page chrome: a flat full-bleed surface fill
 * (no border, no glow — the same constraint every "no rings" round in this file already holds Home to)
 * sets it apart from the plain background behind the rest of the scroll, with a bigger greeting and
 * real breathing room, so it reads as its own distinct block rather than a loose stack of widgets —
 * "maak de hero echt een hero sectie." The greeting flies in letter by letter (Reacticx `animated-text`),
 * then the week strip and Start Workout, THEN a per-muscle-group `RadarChart` — "zet de radar onder de
 * start workout knop" — a real, deliberate reorder from round 42's placement (chart directly under the
 * greeting), not a revert to round 40's "under the calendar" either; this is its own third position.
 * The chart's own axes changed too: "ik wil per spiergroep zien... zodat ze kunnen zien in 1x wat goed
 * en slecht gaat" replaced the five generic axes (workouts/sets/volume/streak/balance) with all ten
 * `ALL_MUSCLE_GROUPS`, each one this week's real set count against a fixed `MUSCLE_TARGET_SETS` — a
 * muscle trained enough pushes its spike to the outer ring, a neglected one pulls in toward the center,
 * so an uneven week reads as a lopsided shape at a glance instead of ten numbers to compare by hand.
 * "Today's plan" (a picture in a slowly turning ring + the planned workout name) used to sit between the
 * week bar and the button — removed outright ("todays plan mag uit de home verdwijnen"), not just
 * restyled. `useTodayWorkout` stays only for its rest-day flag, which still changes the button's own
 * label ("Train Anyway" vs "Start Workout") — a small, still-useful nuance the removal wasn't about. */
export function HomeHero({ name, workouts, streak, onPressStartWorkout }: HomeHeroProps) {
  const today = useTodayWorkout();

  const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
  const thisWeekWorkouts = workouts.filter((workout) => !workout.isBackfilled && weekKeys.has(toDateKey(new Date(workout.completedAt))));
  const setCounts = sumMuscleSetCounts(thisWeekWorkouts);

  const axes: RadarAxisDatum[] = ALL_MUSCLE_GROUPS.map((group) => ({
    label: MUSCLE_SHORT_LABEL[group],
    value: setCounts[group] ?? 0,
    target: MUSCLE_TARGET_SETS,
  }));

  return (
    <View style={{ backgroundColor: colors.neutral.surface, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} className="gap-6 px-4 pb-8 pt-6">
      <AnimatedText
        text={`${greeting()}, ${name.toUpperCase()}`}
        animationConfig={{ characterDelay: 22 }}
        enterFrom={{ translateY: 24, scale: 0.5 }}
        style={{ fontFamily: fontFamily.heading, fontSize: 36, lineHeight: 38, letterSpacing: 1, color: colors.brand.white }}
      />

      <HomeWeekBar workouts={workouts} />

      <PrimaryButton label={today.isRestDay ? "Train Anyway" : "Start Workout"} onPress={onPressStartWorkout} />

      <View className="gap-1">
        <Text style={HOME_EYEBROW}>GOOD VS NEGLECTED</Text>
        <Text style={HOME_SECTION_TITLE}>MUSCLE BALANCE</Text>
      </View>

      <View className="items-center">
        <RadarChart axes={axes} size={300} />
      </View>
    </View>
  );
}
