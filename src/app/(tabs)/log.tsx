import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { DatePickerModal } from "@/components/DatePickerModal";
import { HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeReveal } from "@/components/HomeReveal";
import { HomeRow } from "@/components/HomeRow";
import { HomeRowLead } from "@/components/HomeRowLead";
import { PrimaryButton } from "@/components/PrimaryButton";
import { PromoBanners } from "@/components/PromoBanners";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { WorkoutWeekStrip } from "@/components/WorkoutWeekStrip";
import { images } from "@/constants/images";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { addDays, toDateKey } from "@/lib/date";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import type { RankProfile } from "@/lib/rank";
import { currentWeekday } from "@/lib/weekly-schedule";
import { generateWorkoutSplit } from "@/lib/workout-split-generator";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";
import { colors, fontFamily } from "@/theme";

type LogAction = { key: string; icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void };

/** One row of the action menu — the same flowing, icon-led shape Home/Crew use everywhere else now,
 * not a bordered card per action. `HomeRow` always draws its own bottom hairline, including under
 * the last row — the same look Home's own `MembersRow`/`TodayPlanRow` sequence already has. */
function LogActionRow({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void }) {
  return (
    <HomeRow onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <HomeRowLead kind="flat">
          <Ionicons name={icon} size={18} color={colors.brand.yellow} />
        </HomeRowLead>
        <View className="flex-1 gap-0.5">
          <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]}>{title.toUpperCase()}</Text>
          <Text style={HOME_ROW_DETAIL} numberOfLines={2}>
            {detail}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
      </View>
    </HomeRow>
  );
}

export default function LogScreen() {
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const setLogDateKey = useActiveWorkoutStore((state) => state.setLogDateKey);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);
  const addSet = useActiveWorkoutStore((state) => state.addSet);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const posthog = usePostHog();
  const [pastDatePickerVisible, setPastDatePickerVisible] = useState(false);

  const preferences = useWorkoutSplitStore((state) => state.preferences);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);
  // Same recompute-from-stored-preferences pattern as the split's own screens — never a separate
  // source of truth, so "today's" day here always matches what the split itself would show.
  const plan = useMemo(() => (preferences ? generateWorkoutSplit(ranksByGroup, workouts, preferences) : null), [preferences, ranksByGroup, workouts]);
  const todaysSplitDay = plan?.days.find((day) => day.weekday === currentWeekday()) ?? null;

  function handleStartWorkout() {
    startWorkout();
    posthog.capture("workout_started", { source: "quick_start" });
    router.push("/workout/active");
  }

  function handleStartPastWorkout(date: Date) {
    setPastDatePickerVisible(false);
    discardWorkout();
    startWorkout();
    setLogDateKey(toDateKey(date));
    posthog.capture("workout_started", { source: "past_date" });
    router.push("/workout/active");
  }

  function handleStartFromSplit() {
    if (!todaysSplitDay || !preferences) return;
    discardWorkout();
    startWorkout();
    setName(todaysSplitDay.name);
    for (const id of todaysSplitDay.exerciseIds) {
      const exercise = EXERCISE_BY_ID[id];
      if (!exercise) continue;
      addExercise(exercise);
      // Scaffold the full set count the user asked for up front — they only need to fill in
      // weight/reps from here, not also add sets one by one.
      for (let i = 1; i < preferences.preferredSets; i++) addSet(exercise.id);
    }
    posthog.capture("workout_started", { source: "smart_split_today" });
    router.replace("/workout/active");
  }

  const smartSplitAction = todaysSplitDay
    ? { title: "Smart Split", detail: `${todaysSplitDay.name} — exercises and sets ready to go`, onPress: handleStartFromSplit }
    : plan
      ? { title: "Smart Split", detail: "Rest day in your split — view the full week", onPress: () => router.push("/workout-split/reveal") }
      : { title: "Smart Split", detail: "A weekly plan built from your ranks", onPress: () => router.push("/workout-split/intro") };

  const actions: LogAction[] = [
    { key: "build", icon: "construct-outline", title: "Build Workout", detail: "Create your own workout", onPress: () => router.push("/workout/build") },
    { key: "templates", icon: "clipboard-outline", title: "Choose from Templates", detail: "Use a proven workout plan", onPress: () => router.push("/workout/templates") },
    { key: "split", icon: "trending-up-outline", title: smartSplitAction.title, detail: smartSplitAction.detail, onPress: smartSplitAction.onPress },
    {
      key: "past",
      icon: "calendar-outline",
      title: "Log a Past Workout",
      detail: "Forgot to log a day? Backfill it — won't count toward XP, streaks, PRs, or Crew War",
      onPress: () => setPastDatePickerVisible(true),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
      <PromoBanners placement="log" />

      <View className="mx-4 mt-5 flex-row items-center gap-4">
        <Image source={images.mascotArmsCrossed} resizeMode="contain" style={{ width: 72, height: 72 }} />
        <AnimatedText
          text="READY TO TRAIN?"
          animationConfig={{ characterDelay: 22 }}
          enterFrom={{ translateY: 22, scale: 0.5 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 30, letterSpacing: 1, color: colors.brand.white, flex: 1 }}
        />
      </View>

      <HomeReveal index={1}>
        <PrimaryButton label="Start Workout Now" onPress={handleStartWorkout} />
      </HomeReveal>

      <View className="mx-4">
        {actions.map((action, index) => (
          <HomeReveal key={action.key} index={index + 2} tight>
            <LogActionRow icon={action.icon} title={action.title} detail={action.detail} onPress={action.onPress} />
          </HomeReveal>
        ))}
      </View>

      {workouts.length > 0 && (
        <HomeReveal index={actions.length + 2}>
          <WorkoutWeekStrip
            workouts={workouts}
            onPressWorkout={(workout) => router.push({ pathname: "/workout/summary", params: { id: workout.id } })}
            onSeeAll={() => router.push("/workout/history")}
          />
        </HomeReveal>
      )}

      <DatePickerModal
        visible={pastDatePickerVisible}
        title="Log a Past Workout"
        minDate={addDays(new Date(), -90)}
        maxDate={addDays(new Date(), -1)}
        onClose={() => setPastDatePickerVisible(false)}
        onSelect={handleStartPastWorkout}
      />
    </ScrollView>
  );
}
