import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerModal } from "@/components/DatePickerModal";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { RankBadge } from "@/components/RankBadge";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { addDays } from "@/lib/date";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { goBack } from "@/lib/navigation";
import { buildSnapshotRecords } from "@/lib/profile-snapshot";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

function tierIndexMap(ranksByGroup: Partial<Record<MuscleGroup, MuscleGroupRank>>): Partial<Record<MuscleGroup, number>> {
  const map: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, rank] of Object.entries(ranksByGroup) as [MuscleGroup, MuscleGroupRank][]) {
    if (rank.status === "ranked") map[group] = rank.tierIndex;
  }
  return map;
}

function ChangeRow({ group, before, after }: { group: MuscleGroup; before: MuscleGroupRank | undefined; after: MuscleGroupRank | undefined }) {
  if (!after || after.status !== "ranked") return null;
  const beforeRanked = before?.status === "ranked" ? before : null;
  const improved = !beforeRanked || after.tierIndex > beforeRanked.tierIndex;

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-surface px-3.5 py-3">
      <Text className="body-sm flex-1 font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
      <View className="flex-row items-center gap-2">
        {beforeRanked ? (
          <View className="flex-row items-center gap-1.5">
            <RankBadge tier={beforeRanked.tier} size={22} />
            <Text className="caption text-text-secondary">{formatRankTier(beforeRanked.tier)}</Text>
          </View>
        ) : (
          <Text className="caption text-text-secondary">No data</Text>
        )}
        <Ionicons name="arrow-forward" size={13} color={colors.neutral.textSecondary} />
        <View className="flex-row items-center gap-1.5">
          <RankBadge tier={after.tier} size={22} />
          <Text className="caption font-body-semibold text-text-primary">{formatRankTier(after.tier)}</Text>
        </View>
        {improved && <Ionicons name="arrow-up-circle" size={16} color={colors.semantic.success} />}
      </View>
    </View>
  );
}

export default function BodyGraphHistoryScreen() {
  const insets = useSafeAreaInsets();
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const liveRecords = usePersonalRecordsStore((state) => state.records);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => addDays(today, -30));
  const [pickerVisible, setPickerVisible] = useState(false);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);

  // Same "best-so-far, replayed chronologically" reconstruction the Rank Over Time / snapshot mode
  // already uses (see lib/profile-snapshot.ts) — sourced from the local workout log, so it needs no
  // network round trip and automatically excludes backfilled workouts (their `prs` are always empty,
  // see workout/active.tsx's `isBackfilled` handling), keeping "then" as honest as "now".
  const pastRecords = useMemo(() => {
    const endOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).getTime();
    return buildSnapshotRecords(workouts.filter((workout) => workout.completedAt <= endOfSelectedDay));
  }, [workouts, selectedDate]);

  const pastCards = useMemo(() => buildLiftRankCards(pastRecords, profile, "gym"), [pastRecords, profile]);
  const nowCards = useMemo(() => buildLiftRankCards(liveRecords, profile, "gym"), [liveRecords, profile]);
  const pastRanks = useMemo(() => computeMuscleGroupRanks(pastCards), [pastCards]);
  const nowRanks = useMemo(() => computeMuscleGroupRanks(nowCards), [nowCards]);
  const pastTierIndex = useMemo(() => tierIndexMap(pastRanks), [pastRanks]);
  const nowTierIndex = useMemo(() => tierIndexMap(nowRanks), [nowRanks]);

  const improvedCount = ALL_MUSCLE_GROUPS.filter((group) => {
    const before = pastRanks[group];
    const after = nowRanks[group];
    if (!after || after.status !== "ranked") return false;
    return before?.status !== "ranked" || after.tierIndex > before.tierIndex;
  }).length;

  const colorForTier = (tierIndex: number) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]];

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/ranks/body-graph")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Body Graph History</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3.5"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
              <Ionicons name="calendar-outline" size={17} color={colors.brand.yellow} />
            </View>
            <View>
              <Text className="caption text-text-secondary">Comparing to</Text>
              <Text className="body-md font-body-semibold text-text-primary">
                {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
        </Pressable>

        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.6)}
          className="gap-4 rounded-2xl border border-divider bg-surface p-4"
        >
          <View className="flex-row items-start justify-center">
            <View className="flex-1 items-center gap-2">
              <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1.5 }}>
                THEN
              </Text>
              <MuscleHeatmap
                muscleIntensity={pastTierIndex}
                height={190}
                view="front"
                showLegend={false}
                showViewLabel={false}
                colorForIntensity={colorForTier}
                gender={gender}
              />
            </View>

            <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-yellow" style={{ marginTop: 22 }}>
              <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
            </View>

            <View className="flex-1 items-center gap-2">
              <Text className="caption font-body-bold text-brand-yellow" style={{ letterSpacing: 1.5 }}>
                NOW
              </Text>
              <MuscleHeatmap
                muscleIntensity={nowTierIndex}
                height={190}
                view="front"
                showLegend={false}
                showViewLabel={false}
                colorForIntensity={colorForTier}
                gender={gender}
              />
            </View>
          </View>

          {improvedCount > 0 && (
            <View className="flex-row items-center justify-center gap-1.5 self-center rounded-full bg-brand-yellow/10 px-3.5 py-2">
              <Ionicons name="trending-up" size={14} color={colors.brand.yellow} />
              <Text className="caption font-body-semibold text-brand-yellow">
                {`${improvedCount} muscle group${improvedCount === 1 ? "" : "s"} ranked up since then`}
              </Text>
            </View>
          )}
        </Animated.View>

        <View className="gap-2">
          <Text className="body-md font-body-semibold text-text-primary">What Changed</Text>
          <View className="gap-2">
            {ALL_MUSCLE_GROUPS.map((group) => (
              <ChangeRow key={group} group={group} before={pastRanks[group]} after={nowRanks[group]} />
            ))}
          </View>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={pickerVisible}
        title="Compare to a Date"
        minDate={new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())}
        maxDate={addDays(today, -1)}
        selectedDate={selectedDate}
        onClose={() => setPickerVisible(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}
