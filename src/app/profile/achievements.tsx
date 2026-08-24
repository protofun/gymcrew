import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RankBadge } from "@/components/RankBadge";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { realMemberAchievements } from "@/lib/member-real-profile";
import { buildSnapshotRecords } from "@/lib/profile-snapshot";
import type { RankTier } from "@/lib/rank";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const BADGE_SIZE = 48;
const CONNECTOR_HEIGHT = 20;

function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const liveRecords = usePersonalRecordsStore((state) => state.records);
  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);

  const records = useMemo(
    () => (snapshotAsOfMs != null ? buildSnapshotRecords(workouts.filter((workout) => workout.completedAt <= snapshotAsOfMs)) : liveRecords),
    [snapshotAsOfMs, workouts, liveRecords],
  );

  const achievements = useMemo(() => realMemberAchievements(records, 100), [records]);

  const bodyWeightKg = snapshotAsOfMs != null && snapshotWeightKg != null ? snapshotWeightKg : (onboarding.weightKg ?? 85);
  const cards = useMemo(
    () => buildLiftRankCards(records, { gender: onboarding.gender ?? "male", bodyWeightKg, age: onboarding.age }, "gym"),
    [records, onboarding.gender, bodyWeightKg, onboarding.age],
  );
  const profile = useMemo(
    () => ({ gender: onboarding.gender ?? ("male" as const), bodyWeightKg, age: onboarding.age }),
    [onboarding.gender, bodyWeightKg, onboarding.age],
  );

  function tierForAchievementExercise(exerciseId: string): RankTier | null {
    const exercise = EXERCISE_BY_ID[exerciseId] ?? customExercises.find((candidate) => candidate.id === exerciseId);
    return exercise ? tierForExercise(exercise, cards, records, profile) : null;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Achievements</Text>
      </View>

      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {achievements.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="trophy-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No PRs logged yet.</Text>
            <Text className="body-sm text-text-secondary">Log a set to start building your history.</Text>
          </View>
        ) : (
          achievements.map((achievement, index) => {
            const isLast = index === achievements.length - 1;
            const tier = tierForAchievementExercise(achievement.id);
            return (
              <View key={achievement.id} className="flex-row gap-3">
                <View className="items-center">
                  {tier ? (
                    <RankBadge tier={tier} size={BADGE_SIZE} />
                  ) : (
                    <View className="items-center justify-center rounded-full bg-background" style={{ width: BADGE_SIZE, height: BADGE_SIZE }}>
                      <Ionicons name="trophy" size={22} color={colors.brand.yellow} />
                    </View>
                  )}
                  {!isLast && <View style={{ width: 2, height: CONNECTOR_HEIGHT, backgroundColor: colors.neutral.divider }} />}
                </View>

                <View className={`flex-1 flex-row items-center justify-between gap-2 ${isLast ? "" : "border-b border-divider"} pb-4 pt-1`}>
                  <View className="flex-1 gap-0.5">
                    <Text className="body-md font-body-bold text-text-primary">{achievement.exerciseName}</Text>
                    <Text className="caption text-text-secondary">{formatDate(achievement.achievedAt)}</Text>
                  </View>
                  <Text className="body-md font-body-bold text-text-primary" style={{ flexShrink: 0 }}>
                    {achievement.weightKg} kg × {achievement.reps}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
