import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { DivisionBadge } from "@/components/DivisionBadge";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { RankBadge } from "@/components/RankBadge";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { DIVISION_COLOR } from "@/lib/division";
import { buildLiftRankCards, overallPowerScore, highestTier } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import { computeProfileSnapshot } from "@/lib/profile-snapshot";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

export default function RankHistoryScreen() {
  const insets = useSafeAreaInsets();
  const division = useProfileLevelStore((state) => state.division);
  const xp = useProfileLevelStore((state) => state.xp);
  const divisionHistory = useProfileLevelStore((state) => state.divisionHistory);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const liveRecords = usePersonalRecordsStore((state) => state.records);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);

  const snapshot = useMemo(
    () => (snapshotAsOfMs != null ? computeProfileSnapshot(snapshotAsOfMs, workouts, divisionHistory) : null),
    [snapshotAsOfMs, workouts, divisionHistory],
  );
  const displayDivision = snapshot?.division ?? division;
  const records = snapshot?.records ?? liveRecords;
  const timelineDivisionHistory = snapshotAsOfMs != null ? divisionHistory.filter((entry) => entry.reachedAt <= snapshotAsOfMs) : divisionHistory;

  const cards = useMemo(
    () =>
      buildLiftRankCards(
        records,
        { gender: onboarding.gender ?? "male", bodyWeightKg: snapshotAsOfMs != null && snapshotWeightKg != null ? snapshotWeightKg : (onboarding.weightKg ?? 85), age: onboarding.age },
        "gym",
      ),
    [records, onboarding.gender, onboarding.weightKg, onboarding.age, snapshotAsOfMs, snapshotWeightKg],
  );
  const powerScore = overallPowerScore(cards);
  const topTier = highestTier(cards);
  const weakPoints = cards.filter((card) => card.isWeakPoint);

  const muscleRanks = useMemo(() => computeMuscleGroupRanks(cards), [cards]);
  const rankedEntries = ALL_MUSCLE_GROUPS.flatMap((group) => {
    const rank = muscleRanks[group];
    return rank?.status === "ranked" ? [{ group, rank }] : [];
  });
  const muscleTierIndex = Object.fromEntries(rankedEntries.map(({ group, rank }) => [group, rank.tierIndex]));
  // One badge per tier actually reached, not one per muscle — several muscles can share the same
  // tier, so repeating it per muscle was just noise (same pattern as the crew member profile page).
  const distinctTiers = [...new Set(rankedEntries.map(({ rank }) => rank.tier))].sort(
    (a, b) => RANK_TIERS.indexOf(b) - RANK_TIERS.indexOf(a),
  );

  const timeline = timelineDivisionHistory.map((entry, index) => {
    const next = timelineDivisionHistory[index + 1];
    const endMs = next ? next.reachedAt : (snapshotAsOfMs ?? Date.now());
    const days = Math.max(0, Math.round((endMs - entry.reachedAt) / 86400000));
    return { ...entry, days, isCurrent: !next };
  });

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Rank Over Time</Text>
      </View>

      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
          <DivisionBadge division={displayDivision} size={56} />
          <View className="flex-1">
            <Text className="body-lg font-body-bold" style={{ color: DIVISION_COLOR[displayDivision] }}>
              {displayDivision}
            </Text>
            <Text className="caption text-text-secondary">
              {snapshot == null ? `${xp.toLocaleString("en-US")} total XP earned` : "Division reached as of this date"}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Division Timeline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
            <View className="flex-row items-start">
              {timeline.map((entry, index) => {
                const tint = DIVISION_COLOR[entry.division];
                const isLast = index === timeline.length - 1;
                return (
                  <View key={entry.division} className="flex-row items-start">
                    <View className="items-center" style={{ width: 84 }}>
                      <View
                        className="items-center justify-center rounded-full border-2 bg-background"
                        style={{ width: 48, height: 48, borderColor: entry.isCurrent ? tint : colors.neutral.divider }}
                      >
                        <DivisionBadge division={entry.division} size={36} />
                      </View>
                      <Text className="caption mt-2 font-body-bold text-text-primary" numberOfLines={1}>
                        {entry.division}
                      </Text>
                      <Text className="caption text-center text-text-secondary" numberOfLines={1}>
                        {entry.isCurrent ? `${entry.days}d so far` : `${entry.days}d`}
                      </Text>
                    </View>
                    {!isLast && <View style={{ width: 22, height: 2, backgroundColor: colors.neutral.divider, marginTop: 23 }} />}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="Overview" />
          <StatCard>
            <StatRow label="Power Score" value={powerScore.toLocaleString("en-US")} />
            <StatRow label="Highest Tier Reached" value={formatRankTier(topTier)} />
            <StatRow label="Weak Points" value={weakPoints.length > 0 ? weakPoints.map((card) => card.name).join(", ") : "None"} isLast />
          </StatCard>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="Muscle Rank" />
          {distinctTiers.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-10">
              <Ionicons name="body-outline" size={22} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-center text-text-secondary">Log a bench, squat, deadlift, or overhead press to see ranks here.</Text>
            </View>
          ) : (
            <View className="gap-4 rounded-2xl border border-divider bg-surface p-4">
              <MuscleHeatmap
                muscleIntensity={muscleTierIndex}
                height={220}
                showLegend={false}
                colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
                gender={onboarding.gender ?? "male"}
              />
              <View className="flex-row flex-wrap justify-center gap-4">
                {distinctTiers.map((tier) => (
                  <View key={tier} className="items-center gap-1">
                    <RankBadge tier={tier} size={40} />
                    <Text className="caption font-body-semibold text-text-secondary">{formatRankTier(tier)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="gap-2.5">
          <Text className="body-md font-body-semibold text-text-primary">More</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/ranks")}
            style={PRESSED_STYLE}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <Ionicons name="trophy" size={18} color={colors.brand.yellow} />
            <View className="flex-1">
              <Text className="body-md font-body-semibold text-text-primary">Lift Ranks Overview</Text>
              <Text className="caption text-text-secondary">Every tracked lift&apos;s current tier, gym & worldwide</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/ranks/history")}
            style={PRESSED_STYLE}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <Ionicons name="time" size={18} color={colors.brand.yellow} />
            <View className="flex-1">
              <Text className="body-md font-body-semibold text-text-primary">Rank-Up Timeline</Text>
              <Text className="caption text-text-secondary">See when you climbed each tier, lift by lift</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
