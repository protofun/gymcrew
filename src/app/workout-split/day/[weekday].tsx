import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { EXERCISE_BY_ID } from "@/data/exercises";
import type { Weekday } from "@/data/weekdays";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import type { RankProfile } from "@/lib/rank";
import { generateWorkoutSplit } from "@/lib/workout-split-generator";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

export default function WorkoutSplitDayScreen() {
  const insets = useSafeAreaInsets();
  const { weekday } = useLocalSearchParams<{ weekday: Weekday }>();
  const posthog = usePostHog();

  const preferences = useWorkoutSplitStore((state) => state.preferences);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);

  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);
  const addSet = useActiveWorkoutStore((state) => state.addSet);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);

  // Recomputed the same way reveal.tsx does, from the same stored preferences — never a separate
  // source of truth, so a day always matches whatever the reveal screen just showed.
  const plan = useMemo(() => (preferences ? generateWorkoutSplit(ranksByGroup, workouts, preferences) : null), [preferences, ranksByGroup, workouts]);
  const day = plan?.days.find((d) => d.weekday === weekday) ?? null;
  const priorityByGroup = new Map((plan?.priorities ?? []).map((p) => [p.group, p]));

  const exercises = (day?.exerciseIds ?? []).map((id) => EXERCISE_BY_ID[id]).filter((exercise): exercise is NonNullable<typeof exercise> => !!exercise);
  const repsLabel = preferences ? (preferences.repsMin === preferences.repsMax ? `${preferences.repsMin}` : `${preferences.repsMin}-${preferences.repsMax}`) : "";
  const setsRepsLabel = preferences ? `${preferences.preferredSets} × ${repsLabel}` : "";

  function handleStart() {
    if (!day || !preferences) return;
    discardWorkout();
    startWorkout();
    setName(day.name);
    for (const id of day.exerciseIds) {
      const exercise = EXERCISE_BY_ID[id];
      if (!exercise) continue;
      addExercise(exercise);
      // `addExercise` already creates set #1 — top up to the user's own preferred set count so the
      // workout starts fully scaffolded (right number of empty sets per exercise), not just the
      // exercise list. They only need to fill in weight/reps from there.
      for (let i = 1; i < preferences.preferredSets; i++) addSet(exercise.id);
    }
    posthog.capture("workout_started", { source: "smart_split" });
    router.replace("/workout/active");
  }

  if (!day) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">No workout planned for this day.</Text>
        <Pressable onPress={() => goBack("/(tabs)/profile")} style={PRESSED_STYLE} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{weekday}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 110, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="heading-3 text-text-primary">{day.name}</Text>
          <View className="flex-row flex-wrap gap-2">
            {day.focusGroups.map((group) => {
              const isPriority = (priorityByGroup.get(group)?.priorityScore ?? 0) > 0;
              return (
                <View key={group} className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-2.5 py-1">
                  <Ionicons name={isPriority ? "arrow-up" : "arrow-forward"} size={11} color={isPriority ? colors.brand.yellow : colors.neutral.textSecondary} />
                  <Text className="caption font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="caption font-body-semibold text-text-secondary">EXERCISES</Text>
          {exercises.map((exercise, index) => (
            <View key={exercise.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-background">
                <Text className="caption font-body-bold text-text-secondary">{index + 1}</Text>
              </View>
              {exercise.imageUrl ? (
                <Image source={{ uri: exercise.imageUrl }} className="h-11 w-11 rounded-xl bg-background" />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-background">
                  <Ionicons name="barbell-outline" size={18} color={colors.neutral.textSecondary} />
                </View>
              )}
              <View className="flex-1">
                <Text className="body-sm font-body-semibold text-text-primary" numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text className="caption text-text-secondary">{setsRepsLabel}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable onPress={handleStart} style={PRESSED_STYLE} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Start This Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}
