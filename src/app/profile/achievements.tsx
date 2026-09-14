import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { EditableText } from "@/components/EditableText";
import { RankBadge } from "@/components/RankBadge";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { realMemberPrTimeline } from "@/lib/member-real-profile";
import { buildSnapshotRecords } from "@/lib/profile-snapshot";
import type { RankTier } from "@/lib/rank";
import { formatShortAgo } from "@/lib/time-since";
import { formatWeight } from "@/lib/units";
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

  // Same "as of that moment" snapshot rule as `records` below — a workout logged after the viewed
  // date hasn't happened yet from that vantage point, so its PRs shouldn't appear in the timeline.
  const snapshotWorkouts = useMemo(
    () => (snapshotAsOfMs != null ? workouts.filter((workout) => workout.completedAt <= snapshotAsOfMs) : workouts),
    [snapshotAsOfMs, workouts],
  );

  const records = useMemo(
    () => (snapshotAsOfMs != null ? buildSnapshotRecords(snapshotWorkouts) : liveRecords),
    [snapshotAsOfMs, snapshotWorkouts, liveRecords],
  );

  const prTimeline = useMemo(() => realMemberPrTimeline(snapshotWorkouts, 100), [snapshotWorkouts]);

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
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Personal Records</Text>
      </View>

      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {prTimeline.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="trophy-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No PRs logged yet.</Text>
            <Text className="body-sm text-text-secondary">Log a set to start building your history.</Text>
          </View>
        ) : (
          prTimeline.map((entry, index) => {
            const isLast = index === prTimeline.length - 1;
            const tier = tierForAchievementExercise(entry.exerciseId);
            const agoLabel = formatShortAgo(entry.achievedAt);
            const isNew = agoLabel === "today" || agoLabel.endsWith("d ago");
            const deltaKg = entry.previousBestKg !== null ? Math.round((entry.weightKg - entry.previousBestKg) * 10) / 10 : null;
            return (
              <View key={`${entry.workoutId}-${entry.exerciseId}`} className="flex-row gap-3">
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
                    <View className="flex-row items-center gap-1.5">
                      <EditableText id={`profile.achievements.${entry.workoutId}-${entry.exerciseId}.name`} className="body-md font-body-bold text-text-primary">
                        {entry.exerciseName}
                      </EditableText>
                      {isNew && (
                        <View className="rounded-full bg-brand-yellow px-1.5 py-0.5">
                          <Text className="text-brand-iron" style={{ fontSize: 9, fontWeight: "700" }}>
                            NEW
                          </Text>
                        </View>
                      )}
                    </View>
                    <EditableText id={`profile.achievements.${entry.workoutId}-${entry.exerciseId}.date`} className="caption text-text-secondary">
                      {`${formatDate(entry.achievedAt)}${deltaKg !== null && deltaKg > 0 ? ` · +${formatWeight(deltaKg, weightUnit)}` : ""}`}
                    </EditableText>
                  </View>
                  <EditableText
                    id={`profile.achievements.${entry.workoutId}-${entry.exerciseId}.metric`}
                    className="body-md font-body-bold text-text-primary"
                    style={{ flexShrink: 0 }}
                  >
                    {`${formatWeight(entry.weightKg, weightUnit)} × ${entry.reps}`}
                  </EditableText>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
