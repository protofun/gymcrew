import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { DatePickerModal } from "@/components/DatePickerModal";
import { WorkoutStartCard } from "@/components/WorkoutStartCard";
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

  const smartSplitCard = todaysSplitDay
    ? { title: todaysSplitDay.name, description: "Today's split — exercises and sets ready to go", onPress: handleStartFromSplit }
    : plan
      ? { title: "Smart Split", description: "Rest day in your split — view the full week", onPress: () => router.push("/workout-split/reveal") }
      : { title: "Smart Split", description: "A weekly plan built from your ranks", onPress: () => router.push("/workout-split/intro") };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-6" showsVerticalScrollIndicator={false}>
      <View className="items-center gap-8 pb-8 pt-6">
        <Image source={images.mascotArmsCrossed} resizeMode="contain" style={{ width: 220, height: 220 }} />

        <Text className="heading-3 text-center text-text-primary">WHAT DO YOU WANT TO DO?</Text>

        <View className="w-full gap-3">
          <WorkoutStartCard
            variant="primary"
            icon="flash"
            title="Start Workout Now"
            description="Jump into today's workout"
            onPress={handleStartWorkout}
          />
          <WorkoutStartCard
            icon="construct-outline"
            title="Build Workout"
            description="Create your own workout"
            onPress={() => router.push("/workout/build")}
          />
          <WorkoutStartCard
            icon="clipboard-outline"
            title="Choose from Templates"
            description="Use a proven workout plan"
            onPress={() => router.push("/workout/templates")}
          />
          <WorkoutStartCard icon="trending-up-outline" title={smartSplitCard.title} description={smartSplitCard.description} onPress={smartSplitCard.onPress} />
          <WorkoutStartCard
            icon="calendar-outline"
            title="Log a Past Workout"
            description="Forgot to log a day? Backfill it — won't count toward XP, streaks, PRs, or Crew War"
            onPress={() => setPastDatePickerVisible(true)}
          />
        </View>
      </View>

      {workouts.length > 0 && (
        <WorkoutWeekStrip
          workouts={workouts}
          onPressWorkout={(workout) => router.push({ pathname: "/workout/summary", params: { id: workout.id } })}
          onSeeAll={() => router.push("/workout/history")}
        />
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
