import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { RankBadge } from "@/components/RankBadge";
import { EXERCISE_BY_ID, type Exercise } from "@/data/exercises";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { buildLiftRankCards, type LiftRankCard } from "@/lib/lift-rank-cards";
import { formatRankTier, RANK_TIER_COLOR, type RankProfile, type RankTier } from "@/lib/rank";
import { rankHistoryForCard } from "@/lib/rank-history";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { colors } from "@/theme";

const BADGE_SIZE = 48;
const CONNECTOR_HEIGHT = 28;

function formatHistoryDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

type HistoryLift = { name: string; tier: RankTier; bestWeightKg: number };

/** Uses the precise 9-tracked-lift card when the picked exercise is one of them, falling back to
 * the muscle-group proxy (see generic-lift-rank.ts) for any of the other 800+. */
function buildHistoryLift(exercise: Exercise, cards: LiftRankCard[], records: Record<string, PersonalRecord>, profile: RankProfile): HistoryLift {
  const knownCard = cards.find((card) => card.exerciseId === exercise.id);
  if (knownCard) return { name: knownCard.name, tier: knownCard.tier, bestWeightKg: knownCard.bestWeightKg };

  const bestWeightKg = records[exercise.id]?.bestWeightKg ?? 0;
  const bestReps = records[exercise.id]?.bestReps ?? 0;
  const detail = genericExerciseRankDetail(exercise, bestWeightKg, bestReps, profile);
  return { name: exercise.name, tier: detail.tier, bestWeightKg };
}

export default function RankHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { liftId } = useLocalSearchParams<{ liftId?: string }>();

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  // `liftId` might be one of the 9 tracked lifts, a custom (non-tracked) exercise id, or absent —
  // in that order of preference, falling back to the first tracked lift if none of those resolve.
  function resolveInitialExercise(): Exercise | null {
    const matchingCard = liftId ? cards.find((card) => card.id === liftId) : undefined;
    if (matchingCard) return EXERCISE_BY_ID[matchingCard.exerciseId] ?? null;
    if (liftId && EXERCISE_BY_ID[liftId]) return EXERCISE_BY_ID[liftId];
    return EXERCISE_BY_ID[cards[0].exerciseId] ?? null;
  }
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(resolveInitialExercise);
  const [pickerOpen, setPickerOpen] = useState(false);

  const lift = selectedExercise ? buildHistoryLift(selectedExercise, cards, records, profile) : null;
  const history = useMemo(() => (lift ? rankHistoryForCard(lift) : []), [lift]);

  if (!selectedExercise || !lift) {
    router.replace("/(tabs)/ranks");
    return null;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Rank History</Text>
      </View>

      <View className="px-4 pt-4">
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3.5"
        >
          <View className="flex-row items-center gap-2.5">
            <RankBadge tier={lift.tier} size={26} />
            <Text className="body-md font-body-semibold text-text-primary">{lift.name}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 1 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-10">
            <Ionicons name="time-outline" size={22} color={colors.neutral.textSecondary} />
            <Text className="body-sm text-center text-text-secondary">
              Still on your first tier for {lift.name} — rank-ups will show up here as you climb.
            </Text>
          </View>
        ) : (
          history.map((entry, index) => {
            const isLast = index === history.length - 1;
            const tint = RANK_TIER_COLOR[entry.tier];
            return (
              <View key={entry.tier} className="flex-row gap-3">
                <View className="items-center">
                  <RankBadge tier={entry.tier} size={BADGE_SIZE} />
                  {!isLast && <View style={{ width: 2, height: CONNECTOR_HEIGHT, backgroundColor: colors.neutral.divider }} />}
                </View>

                <View className={`flex-1 flex-row items-center justify-between ${isLast ? "" : "border-b border-divider"} pb-4 pt-1`}>
                  <View className="gap-0.5">
                    <Text className="body-md font-body-bold" style={{ color: tint }}>
                      {formatRankTier(entry.tier).toUpperCase()}
                    </Text>
                    <Text className="caption text-text-secondary">{formatHistoryDate(entry.achievedAt)}</Text>
                  </View>
                  <Text className="body-md font-body-bold text-text-primary">{entry.weightKg} kg</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ExercisePickerModal
        visible={pickerOpen}
        title="Rank History"
        subtitle="Pick any exercise to see its rank-up timeline."
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setSelectedExercise(exercise);
          setPickerOpen(false);
        }}
        hideCreateRow
        renderLeading={(exercise) => <RankBadge tier={buildHistoryLift(exercise, cards, records, profile).tier} size={34} />}
      />
    </View>
  );
}
