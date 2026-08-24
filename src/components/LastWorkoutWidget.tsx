import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { WorkoutSummaryModal } from "@/components/WorkoutSummaryModal";
import { EXERCISE_BY_ID, findExerciseByDisplayName } from "@/data/exercises";
import type { WorkoutSession } from "@/data/workout-log";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { getLastWorkout } from "@/lib/workout-history";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors } from "@/theme";

type LastWorkoutWidgetProps = {
  sessions: Record<string, WorkoutSession>;
};

export function LastWorkoutWidget({ sessions }: LastWorkoutWidgetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const today = useMemo(() => new Date(), []);
  const lastWorkout = useMemo(() => getLastWorkout(sessions, today), [sessions, today]);

  const onboarding = useOnboardingStore((state) => state.onboarding);
  const records = usePersonalRecordsStore((state) => state.records);
  const profile = useMemo(
    () => ({ gender: onboarding.gender ?? ("male" as const), bodyWeightKg: onboarding.weightKg ?? 85, age: onboarding.age }),
    [onboarding.gender, onboarding.weightKg, onboarding.age],
  );
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  if (!lastWorkout) return null;
  const { date, session } = lastWorkout;
  const exercise =
    (session.primaryExercise.exerciseId ? EXERCISE_BY_ID[session.primaryExercise.exerciseId] : undefined) ??
    findExerciseByDisplayName(session.primaryExercise.name);
  const tier = exercise ? tierForExercise(exercise, cards, records, profile) : null;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="mx-4 mt-8 flex-row items-center gap-3 rounded-3xl border border-divider bg-surface p-4"
      >
        <View className="flex-1 gap-1.5">
          <Text className="body-md font-body-bold text-text-primary">LAST WORKOUT</Text>
          <Text className="caption text-text-secondary">
            {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {session.name}
          </Text>
          <Text className="body-lg font-body-semibold text-text-primary">{session.primaryExercise.name}</Text>

          <View className="mt-1.5 flex-row gap-5">
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">Volume</Text>
              <Text className="body-md font-body-semibold text-text-primary">
                {session.volumeKg.toLocaleString("en-US")} kg
              </Text>
            </View>
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">Reps</Text>
              <Text className="body-md font-body-semibold text-text-primary">{session.primaryExercise.reps}</Text>
            </View>
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">1RM Est.</Text>
              <Text className="body-md font-body-semibold text-text-primary">
                {session.primaryExercise.oneRepMaxKg} kg
              </Text>
            </View>
          </View>
        </View>

        {exercise && (
          <Image source={{ uri: exercise.imageUrl }} resizeMode="cover" className="h-24 w-24 rounded-2xl" />
        )}

        <View className="items-center gap-1.5">
          {tier && <RankBadge tier={tier} size={32} />}
          <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
        </View>
      </Pressable>

      <WorkoutSummaryModal visible={modalVisible} onClose={() => setModalVisible(false)} date={date} session={session} />
    </>
  );
}
