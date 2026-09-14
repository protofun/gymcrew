import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EditableText } from "@/components/EditableText";
import { RankBadge } from "@/components/RankBadge";
import { WorkoutSummaryModal } from "@/components/WorkoutSummaryModal";
import { exerciseByIdWithCustom } from "@/data/exercises";
import type { WorkoutSession } from "@/data/workout-log";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { toDateKey } from "@/lib/date";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { RANK_TIERS, type RankTier } from "@/lib/rank";
import { formatWeight } from "@/lib/units";
import { getLastWorkout } from "@/lib/workout-history";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
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
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const weightUnit = useWeightUnit();
  const profile = useMemo(
    () => ({ gender: onboarding.gender ?? ("male" as const), bodyWeightKg: onboarding.weightKg ?? 85, age: onboarding.age }),
    [onboarding.gender, onboarding.weightKg, onboarding.age],
  );
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  // The best tier reached by ANY exercise trained that day — not just the single heaviest lift
  // `session.primaryExercise` tracks — so the widget's medal reflects the whole session's highlight,
  // in the spot the exercise photo used to occupy.
  const highestTier: RankTier | null = useMemo(() => {
    if (!lastWorkout) return null;
    const dateKey = toDateKey(lastWorkout.date);
    const sessionWorkouts = workouts.filter((workout) => toDateKey(new Date(workout.completedAt)) === dateKey);
    let best: RankTier | null = null;
    for (const workout of sessionWorkouts) {
      for (const loggedExercise of workout.exercises) {
        const exercise = exerciseByIdWithCustom(loggedExercise.exerciseId, customExercises);
        if (!exercise) continue;
        const tier = tierForExercise(exercise, cards, records, profile);
        if (!best || RANK_TIERS.indexOf(tier) > RANK_TIERS.indexOf(best)) best = tier;
      }
    }
    return best;
  }, [lastWorkout, workouts, cards, records, profile, customExercises]);

  if (!lastWorkout) return null;
  const { date, session } = lastWorkout;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="mx-4 mt-8 flex-row items-center gap-3 rounded-3xl border border-divider bg-surface p-4"
      >
        <View className="flex-1 gap-1.5">
          <Text className="body-md font-body-bold text-text-primary">LAST WORKOUT</Text>
          <EditableText id="home.lastWorkout.dateAndName" className="caption text-text-secondary">
            {`${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${session.name}`}
          </EditableText>
          <EditableText id="home.lastWorkout.exerciseName" className="body-lg font-body-semibold text-text-primary">
            {session.primaryExercise.name}
          </EditableText>

          <View className="mt-1.5 flex-row gap-5">
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">Volume</Text>
              <EditableText id="home.lastWorkout.volume" className="body-md font-body-semibold text-text-primary">
                {formatWeight(session.volumeKg, weightUnit)}
              </EditableText>
            </View>
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">Reps</Text>
              <EditableText id="home.lastWorkout.reps" className="body-md font-body-semibold text-text-primary">
                {String(session.primaryExercise.reps)}
              </EditableText>
            </View>
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">1RM Est.</Text>
              <EditableText id="home.lastWorkout.oneRepMax" className="body-md font-body-semibold text-text-primary">
                {formatWeight(session.primaryExercise.oneRepMaxKg, weightUnit)}
              </EditableText>
            </View>
          </View>
        </View>

        {highestTier && (
          <View className="h-24 w-24 items-center justify-center rounded-2xl bg-background">
            <RankBadge tier={highestTier} size={64} />
          </View>
        )}

        <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
      </Pressable>

      <WorkoutSummaryModal visible={modalVisible} onClose={() => setModalVisible(false)} date={date} session={session} />
    </>
  );
}
