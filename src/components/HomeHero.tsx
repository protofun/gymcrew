import { View } from "react-native";

import { HomeWeekBar } from "@/components/HomeWeekBar";
import { PrimaryButton } from "@/components/PrimaryButton";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { colors, fontFamily } from "@/theme";
import type { CompletedWorkout } from "@/store/workout-history-store";

type HomeHeroProps = {
  name: string;
  workouts: CompletedWorkout[];
  onPressStartWorkout?: () => void;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The top of Home — a welcome, not a wall of numbers: the greeting flies in letter by letter (Reacticx `animated-text`), then the
 * week exactly as the Nutrition diary opens with it (Reacticx `segmented-control`), so the two halves of the app feel like one, with
 * how many days you've trained this week rolling up beside it — straight into Start Workout. "Today's plan" (a picture in a slowly
 * turning ring + the planned workout name) used to sit between the week bar and the button — removed outright ("todays plan mag uit
 * de home verdwijnen"), not just restyled. `useTodayWorkout` stays only for its rest-day flag, which still changes the button's own
 * label ("Train Anyway" vs "Start Workout") — a small, still-useful nuance the removal wasn't about. */
export function HomeHero({ name, workouts, onPressStartWorkout }: HomeHeroProps) {
  const today = useTodayWorkout();

  return (
    <View className="gap-5 px-4 pt-5">
      <AnimatedText
        text={`${greeting()}, ${name.toUpperCase()}`}
        animationConfig={{ characterDelay: 22 }}
        enterFrom={{ translateY: 24, scale: 0.5 }}
        style={{ fontFamily: fontFamily.heading, fontSize: 34, lineHeight: 36, letterSpacing: 1, color: colors.brand.white }}
      />

      <HomeWeekBar workouts={workouts} />

      <PrimaryButton label={today.isRestDay ? "Train Anyway" : "Start Workout"} onPress={onPressStartWorkout} />
    </View>
  );
}
