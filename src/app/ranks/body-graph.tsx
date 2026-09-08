import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EditableText } from "@/components/EditableText";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { MuscleRankRow } from "@/components/MuscleRankRow";
import { RankBadge } from "@/components/RankBadge";
import { muscleGroupImages } from "@/constants/images";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { memberLiftCards, muscleGroupRanksForCrewMember } from "@/lib/crew-lift-compare";
import { buildLiftRankCards, type LiftRankCard } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatReadyAt, formatRecoveryLabel, recoveryStatusForAllGroups } from "@/lib/muscle-recovery";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { rankForHypotheticalWeight, weeksNeededForGoal, weightNeededForTier } from "@/lib/rank-simulator";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

function MuscleRecoveryRow({ group, status }: { group: MuscleGroup; status: ReturnType<typeof recoveryStatusForAllGroups>[MuscleGroup] }) {
  const dotColor = status.isRecovered ? colors.semantic.success : colors.semantic.warning;
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-background px-3 py-2.5">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <Text className="body-sm flex-1 font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
      <View className="items-end">
        <Text className="caption font-body-semibold" style={{ color: dotColor }}>
          {formatRecoveryLabel(status)}
        </Text>
        {status.readyAt !== null && !status.isRecovered && (
          <Text className="caption text-text-secondary">{formatReadyAt(status.readyAt)}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Weeks to close this group's gap to its next tier — anchored on the real bestWeightKg of whichever
 * contributing lift weighs most into its composite rank (see muscle-group-rank.ts's
 * MUSCLE_GROUP_WEIGHTS), not a fabricated number. Reuses the exact same estimate machinery as the
 * "What's My Rank" simulator (lib/rank-simulator.ts) — a directional estimate from the user's own
 * historical pace, never promised as exact. `null` at the top tier already (nothing left to close).
 */
function estimateWeeksToNextTier(rank: Extract<MuscleGroupRank, { status: "ranked" }>, cards: LiftRankCard[], profile: RankProfile): number | null {
  if (rank.tierIndex >= RANK_TIERS.length - 1) return null;
  const topContributor = [...rank.contributingLifts].sort((a, b) => b.weight - a.weight)[0];
  const card = topContributor ? cards.find((c) => c.id === topContributor.liftId) : undefined;
  if (!card) return null;

  const nextTierIndex = rank.tierIndex + 1;
  const goalWeightKg = weightNeededForTier(nextTierIndex, (weightKg) => rankForHypotheticalWeight(card, weightKg, profile));
  return weeksNeededForGoal(card.bestWeightKg, goalWeightKg) || null;
}

function GroupDetailSheet({
  group,
  rank,
  onClose,
  canLog,
  myCards,
  myProfile,
}: {
  group: MuscleGroup | null;
  rank: MuscleGroupRank | null;
  onClose: () => void;
  /** Also gates the "estimated journey" + "Build a plan" CTA below — both are about the current
   * user's own next steps, so neither makes sense while viewing a crew member's body graph. */
  canLog: boolean;
  myCards: LiftRankCard[];
  myProfile: RankProfile;
}) {
  const insets = useSafeAreaInsets();
  const estimatedWeeks = group && rank?.status === "ranked" && canLog ? estimateWeeksToNextTier(rank, myCards, myProfile) : null;

  return (
    <Modal visible={group !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        <Pressable onPress={() => {}} style={{ paddingBottom: insets.bottom + 20 }} className="gap-4 rounded-t-3xl border-t border-divider bg-surface p-5">
          {group && rank && (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="heading-4 text-text-primary">{formatMuscleLabel(group)}</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
                </Pressable>
              </View>

              <Image
                source={muscleGroupImages[group]}
                resizeMode="cover"
                style={{ width: "100%", height: 160, borderRadius: 16 }}
              />

              {rank.status === "ranked" ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <RankBadge tier={rank.tier} size={56} />
                    <View>
                      <Text className="heading-4" style={{ color: RANK_TIER_COLOR[rank.tier] }}>
                        {formatRankTier(rank.tier)}
                      </Text>
                      <Text className="caption text-text-secondary">Composite rank for {formatMuscleLabel(group).toLowerCase()}</Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="caption font-body-semibold text-text-secondary">CONTRIBUTING LIFTS</Text>
                    {rank.contributingLifts.map((lift) => (
                      <View key={lift.liftId} className="flex-row items-center justify-between rounded-xl bg-background px-3 py-2.5">
                        <View className="flex-row items-center gap-2">
                          <RankBadge tier={lift.tier} size={22} />
                          <Text className="body-sm text-text-primary">{formatRankTier(lift.tier)}</Text>
                        </View>
                        <Text className="caption text-text-secondary">{Math.round(lift.weight * 100)}% weight</Text>
                      </View>
                    ))}
                  </View>

                  {canLog && rank.tierIndex < RANK_TIERS.length - 1 && (
                    <>
                      {estimatedWeeks != null && (
                        <View className="flex-row items-start gap-2 rounded-xl bg-background p-3">
                          <Ionicons name="hourglass-outline" size={15} color={colors.neutral.textSecondary} style={{ marginTop: 1 }} />
                          <Text className="body-sm flex-1 text-text-secondary">
                            Estimated {estimatedWeeks}-week journey to {formatRankTier(RANK_TIERS[rank.tierIndex + 1])} at a typical pace —
                            actual progress varies.
                          </Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => {
                          onClose();
                          router.push({ pathname: "/workout-split/setup", params: { muscle: group } });
                        }}
                        style={PRESSED_STYLE}
                        className="flex-row items-center justify-center gap-2 rounded-full border border-brand-yellow py-3.5"
                      >
                        <Ionicons name="trending-up-outline" size={16} color={colors.brand.yellow} />
                        <Text className="body-sm font-body-semibold text-brand-yellow">Build a plan for {formatMuscleLabel(group)}</Text>
                      </Pressable>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-3">
                    <View className="h-14 w-14 items-center justify-center rounded-full border border-dashed border-divider">
                      <Ionicons name="help" size={24} color={colors.neutral.textSecondary} />
                    </View>
                    <View className="flex-1">
                      <Text className="body-md font-body-semibold text-text-primary">Not enough data yet</Text>
                      <Text className="body-sm text-text-secondary">
                        No linked exercises are tracked for {formatMuscleLabel(group).toLowerCase()} yet.
                      </Text>
                    </View>
                  </View>

                  {rank.suggestedExercises.length > 0 && (
                    <View className="gap-2 rounded-xl bg-background p-3">
                      <Text className="caption font-body-semibold text-text-secondary">TRY LOGGING</Text>
                      <Text className="body-sm text-text-primary">{rank.suggestedExercises.join(", ")}</Text>
                      <Text className="caption text-text-secondary">
                        Log at least {rank.sessionsNeeded} sessions to see a reliable {formatMuscleLabel(group).toLowerCase()} rank.
                      </Text>
                    </View>
                  )}

                  {canLog && (
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push("/(tabs)/log");
                      }}
                      style={PRESSED_STYLE}
                      className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
                    >
                      <Ionicons name="add-circle" size={18} color={colors.brand.iron} />
                      <Text className="body-md font-body-semibold text-brand-iron">Log This Exercise</Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MuscleRankScreen() {
  const insets = useSafeAreaInsets();
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const crewMembers = useCrewStore((state) => state.members);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const recoveryByGroup = useMemo(() => recoveryStatusForAllGroups(workouts), [workouts]);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const myCards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  const viewingOtherMember = !!memberId && memberId !== CURRENT_MEMBER_ID;
  const viewedMember = viewingOtherMember ? crewMembers.find((member) => member.id === memberId) : undefined;
  const cards = useMemo(
    () => (viewingOtherMember ? memberLiftCards(memberId!, myCards, membersActivity) : myCards),
    [viewingOtherMember, memberId, myCards, membersActivity],
  );
  const ranksByGroup = useMemo(
    () => (viewingOtherMember ? muscleGroupRanksForCrewMember(memberId!, myCards, membersActivity) : computeMuscleGroupRanks(cards)),
    [viewingOtherMember, memberId, myCards, cards, membersActivity],
  );

  const tierIndexByGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, rank] of Object.entries(ranksByGroup) as [MuscleGroup, MuscleGroupRank][]) {
    if (rank.status === "ranked") tierIndexByGroup[group] = rank.tierIndex;
  }

  const rankedCount = Object.keys(tierIndexByGroup).length;
  const presentTiers = Array.from(new Set(Object.values(tierIndexByGroup))).sort((a, b) => b - a);
  const hasInsufficientData = Object.values(ranksByGroup).some((rank) => rank?.status === "insufficient-data");

  const selectedRank = selectedGroup ? (ranksByGroup[selectedGroup] ?? null) : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{viewedMember ? `${viewedMember.name}'s Muscle Rank` : "Muscle Rank"}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.6)}
          className="gap-4 rounded-2xl border border-divider bg-surface p-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
              {viewedMember ? `${viewedMember.name.toUpperCase()}'S OVERVIEW` : "BODY OVERVIEW"}
            </Text>
            <View className="rounded-full border border-divider px-2.5 py-1">
              <EditableText id="ranks.bodyGraph.rankedCount" className="caption font-body-bold text-text-primary">
                {`${rankedCount}/${ALL_MUSCLE_GROUPS.length} RANKED`}
              </EditableText>
            </View>
          </View>

          <MuscleHeatmap
            muscleIntensity={tierIndexByGroup}
            showLegend={false}
            colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
            onPressGroup={(group) => setSelectedGroup(group)}
            gender={gender}
          />

          <View className="flex-row flex-wrap justify-center gap-2">
            {presentTiers.map((tierIndex) => {
              const tier = RANK_TIERS[tierIndex];
              return (
                <View key={tier} className="flex-row items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
                  <RankBadge tier={tier} size={16} />
                  <Text className="caption font-body-semibold" style={{ color: RANK_TIER_COLOR[tier] }}>
                    {formatRankTier(tier)}
                  </Text>
                </View>
              );
            })}
            {hasInsufficientData && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
                <View className="h-4 w-4 items-center justify-center rounded-full border border-dashed border-divider" />
                <Text className="caption font-body-semibold text-text-secondary">No data</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {!viewingOtherMember && (
          <Animated.View
            entering={FadeInUp.delay(50).springify().damping(16).mass(0.6)}
            className="gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="body-md font-body-semibold text-text-primary">Muscle Recovery</Text>
                <Text className="caption text-text-secondary">Show real rest-time estimates per muscle group.</Text>
              </View>
              <Switch
                value={showRecovery}
                onValueChange={setShowRecovery}
                trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
                thumbColor={colors.brand.white}
              />
            </View>
            {showRecovery && (
              <View className="gap-2">
                {ALL_MUSCLE_GROUPS.map((group) => (
                  <MuscleRecoveryRow key={group} group={group} status={recoveryByGroup[group]} />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {!viewingOtherMember && (
          <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)}>
            <Pressable
              onPress={() => router.push("/workout-split/intro")}
              style={PRESSED_STYLE}
              className="flex-row items-center gap-3 rounded-2xl bg-brand-yellow px-4 py-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-iron/10">
                <Ionicons name="trending-up-outline" size={20} color={colors.brand.iron} />
              </View>
              <View className="flex-1">
                <Text className="body-md font-body-semibold text-brand-iron">Build My Split</Text>
                <Text className="body-sm text-brand-iron/70">Turn your rank gaps into your next training plan.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.brand.iron} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)} className="gap-1">
          <Text style={sectionHeaderStyle} className="text-brand-white">
            MUSCLE GROUPS
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="hand-left" size={13} color={colors.brand.yellow} />
            <Text className="caption font-body-semibold text-text-secondary">Tap any group to see what&apos;s behind the number.</Text>
          </View>
        </Animated.View>

        <View className="gap-2.5">
          {ALL_MUSCLE_GROUPS.map((group, index) => {
            const rank = ranksByGroup[group];
            if (!rank) return null;
            return (
              <MuscleRankRow
                key={group}
                group={group}
                tier={rank.status === "ranked" ? rank.tier : null}
                index={index}
                onPress={() => setSelectedGroup(group)}
              />
            );
          })}
        </View>
      </ScrollView>

      <GroupDetailSheet
        group={selectedGroup}
        rank={selectedRank}
        onClose={() => setSelectedGroup(null)}
        canLog={!viewingOtherMember}
        myCards={myCards}
        myProfile={profile}
      />
    </View>
  );
}
