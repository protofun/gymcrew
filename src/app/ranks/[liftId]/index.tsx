import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { MOCK_WORKOUT_SESSIONS } from "@/data/workout-log";
import { crewLiftStandings, type CrewLiftStanding } from "@/lib/crew-lift-compare";
import { fromDateKey } from "@/lib/date";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { buildLiftRankCards, SCORE_PER_BODYWEIGHT_RATIO, type LiftRankCard } from "@/lib/lift-rank-cards";
import { memberStrengthProgress } from "@/lib/member-mock-profile";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors, fontFamily } from "@/theme";

const RANGE_OPTIONS = [
  { key: "6m", label: "6M", days: 182 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;
type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

const NEARBY_WINDOW_SIZE = 3;

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

/** Either one of the 9 tracked lifts (with its real `LiftRankCard`, powering crew standings) or any
 * other exercise from the library, ranked via the same muscle-group proxy the wizard/overview use. */
type DetailCard = {
  id: string;
  name: string;
  tier: RankTier;
  percentileInTier: number;
  score: number;
  bestWeightKg: number;
  kgToNextTier: number | null;
  isWeakPoint: boolean;
  knownCard: LiftRankCard | null;
};

function nearbyStandings(standings: CrewLiftStanding[]): CrewLiftStanding[] {
  const myIndex = standings.findIndex((standing) => standing.isMe);
  if (myIndex === -1) return standings.slice(0, NEARBY_WINDOW_SIZE);
  const start = Math.max(0, Math.min(myIndex - 1, standings.length - NEARBY_WINDOW_SIZE));
  return standings.slice(start, start + NEARBY_WINDOW_SIZE);
}

function StandingRow({ standing, rank, onPress }: { standing: CrewLiftStanding; rank: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={PRESSED_STYLE}
      className={`flex-row items-center gap-3 rounded-xl p-2.5 ${standing.isMe ? "border border-brand-yellow/40 bg-brand-yellow/5" : ""}`}
    >
      <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{rank}</Text>
      <View className="flex-1 flex-row items-center gap-1.5">
        <Text className={`body-md font-body-semibold ${standing.isMe ? "text-brand-yellow" : "text-text-primary"}`} numberOfLines={1}>
          {standing.isMe ? "You" : standing.name}
        </Text>
        {!standing.isMe && <Text className="caption font-body-semibold text-brand-yellow">(Compare)</Text>}
      </View>
      <Text className="body-md font-body-bold text-text-primary">{standing.weightKg} kg</Text>
    </Pressable>
  );
}

export default function LiftRankDetailScreen() {
  const insets = useSafeAreaInsets();
  const { liftId } = useLocalSearchParams<{ liftId: string }>();
  const [range, setRange] = useState<RangeKey>("1y");

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const crewMembers = useCrewStore((state) => state.members);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  // "Gym" scope, same as the rank page's default — this detail view doesn't have its own toggle yet.
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const knownCard = cards.find((candidate) => candidate.id === liftId) ?? null;
  const customExercise = !knownCard && liftId ? (EXERCISE_BY_ID[liftId] ?? null) : null;

  const card: DetailCard | null = knownCard
    ? {
        id: knownCard.id,
        name: knownCard.name,
        tier: knownCard.tier,
        percentileInTier: knownCard.percentileInTier,
        score: knownCard.score,
        bestWeightKg: knownCard.bestWeightKg,
        kgToNextTier: knownCard.kgToNextTier,
        isWeakPoint: knownCard.isWeakPoint,
        knownCard,
      }
    : customExercise
      ? (() => {
          const record = records[customExercise.id];
          const bestWeightKg = record?.bestWeightKg ?? 0;
          const detail = genericExerciseRankDetail(customExercise, bestWeightKg, record?.bestReps ?? 0, profile);
          return {
            id: customExercise.id,
            name: customExercise.name,
            tier: detail.tier,
            percentileInTier: detail.progressToNextTier,
            score: Math.round((bestWeightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO),
            bestWeightKg,
            kgToNextTier: detail.kgToNextTier,
            isWeakPoint: false,
            knownCard: null,
          };
        })()
      : null;

  const standings = useMemo(
    () => (knownCard ? crewLiftStandings(knownCard.id, knownCard, crewMembers) : []),
    [knownCard, crewMembers],
  );

  if (!card) {
    router.replace("/(tabs)/ranks");
    return null;
  }

  const tint = RANK_TIER_COLOR[card.tier];
  const percent = Math.round(card.percentileInTier * 100);
  const topPercent = Math.max(1, 100 - percent);
  const tierIndex = RANK_TIERS.indexOf(card.tier);
  const nextTier = tierIndex < RANK_TIERS.length - 1 ? RANK_TIERS[tierIndex + 1] : null;

  const rawTrendPoints = memberStrengthProgress(MOCK_WORKOUT_SESSIONS)[card.name] ?? [];
  const rangeDays = RANGE_OPTIONS.find((option) => option.key === range)?.days ?? null;
  const trendPoints = rangeDays
    ? rawTrendPoints.filter((point) => Date.now() - fromDateKey(point.date).getTime() <= rangeDays * 86400000)
    : rawTrendPoints;

  const nearby = nearbyStandings(standings);
  const nearbyStartRank = standings.findIndex((standing) => standing.id === nearby[0]?.id) + 1;

  function goToCompare(withId: string) {
    router.push(`/ranks/${card!.id}/compare?withId=${withId}`);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary" numberOfLines={1}>
          {card.name}
        </Text>
        <Pressable
          onPress={() => router.push(`/ranks/history?liftId=${card.id}`)}
          hitSlop={8}
          style={({ pressed }) => ({ position: "absolute", right: 16, opacity: pressed ? 0.7 : 1 })}
          className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-2.5 py-1.5"
        >
          <Ionicons name="time-outline" size={13} color={colors.neutral.textSecondary} />
          <Text className="caption font-body-semibold text-text-secondary">History</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-2">
          <RankBadge tier={card.tier} size={140} />
          <Text className="heading-2" style={{ color: tint }}>
            {formatRankTier(card.tier)}
          </Text>
          <Text className="body-sm text-text-secondary">Top {topPercent}%</Text>

          {card.isWeakPoint && (
            <View className="mt-1 flex-row items-center gap-1.5 rounded-full border border-error/40 bg-error/10 px-3 py-1.5">
              <Ionicons name="warning" size={13} color={colors.semantic.error} />
              <Text className="caption font-body-semibold" style={{ color: colors.semantic.error }}>
                Lagging behind your other lifts
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="caption font-body-semibold text-text-secondary">{nextTier ? `Toward ${formatRankTier(nextTier)}` : "Top tier reached"}</Text>
            <Text className="caption font-body-bold text-text-primary">{percent}%</Text>
          </View>
          <ProgressBar ratio={card.percentileInTier} color={tint} height={8} />
          {card.kgToNextTier !== null && (
            <Text className="caption text-right text-text-secondary">{card.kgToNextTier}kg to go</Text>
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">BEST SET (1RM)</Text>
            <Text className="heading-4 text-text-primary">{card.bestWeightKg} KG</Text>
          </View>
          <View className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">POWER SCORE</Text>
            <Text className="heading-4 text-text-primary">{card.score.toLocaleString("en-US")}</Text>
          </View>
          <View className="flex-1 items-center gap-1 rounded-2xl border border-divider bg-surface p-3">
            <Text className="caption text-text-secondary">PERCENTILE</Text>
            <Text className="heading-4 text-text-primary">{percent}%</Text>
          </View>
        </View>

        <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
              STRENGTH TREND
            </Text>
            <View className="flex-row rounded-full border border-divider bg-background p-0.5">
              {RANGE_OPTIONS.map((option) => {
                const active = option.key === range;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setRange(option.key)}
                    className={`items-center rounded-full px-2.5 py-1 ${active ? "bg-brand-yellow" : ""}`}
                  >
                    <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <StrengthProgressChart exerciseName={card.name} points={trendPoints} title="1RM (kg)" unit="kg" />
        </View>

        {card.knownCard && (
          <View className="gap-2 rounded-2xl border border-divider bg-surface p-4">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
              IN YOUR CREW
            </Text>
            <View className="gap-1">
              {nearby.map((standing, index) => (
                <StandingRow
                  key={standing.id}
                  standing={standing}
                  rank={nearbyStartRank + index}
                  onPress={standing.isMe ? undefined : () => goToCompare(standing.id)}
                />
              ))}
            </View>
          </View>
        )}

        {nextTier && card.kgToNextTier !== null ? (
          <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-divider bg-surface p-4">
            <View className="gap-0.5">
              <Text className="caption text-text-secondary">FOR PROMOTION TO {nextTier.toUpperCase()}</Text>
              <Text className="body-lg font-body-semibold text-text-primary">{card.bestWeightKg + card.kgToNextTier} kg needed</Text>
            </View>
            <View className="rounded-full bg-brand-yellow/15 px-3 py-1.5">
              <Text className="body-sm font-body-bold text-brand-yellow">+{card.kgToNextTier}kg</Text>
            </View>
          </View>
        ) : nextTier ? (
          <View className="items-center gap-1 rounded-2xl border border-divider bg-surface p-4">
            <Ionicons name="trending-up" size={18} color={colors.brand.yellow} />
            <Text className="body-md font-body-semibold text-text-primary">Keep logging sets</Text>
            <Text className="caption text-center text-text-secondary">
              More reps and heavier sets push you toward {formatRankTier(nextTier)}.
            </Text>
          </View>
        ) : (
          <View className="items-center gap-1 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4">
            <Ionicons name="trophy" size={20} color={colors.brand.yellow} />
            <Text className="body-md font-body-semibold text-brand-yellow">Top tier reached</Text>
            <Text className="caption text-center text-text-secondary">
              There&apos;s no tier above {formatRankTier(card.tier)} — you&apos;re maxed out.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
