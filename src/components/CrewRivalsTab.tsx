import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInUp, useSharedValue, withTiming } from "react-native-reanimated";

import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { CrewSwitcher } from "@/components/CrewSwitcher";
import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { type DuelMetric, DuelChallengeSheet } from "@/components/DuelChallengeSheet";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { SectionHeading } from "@/components/SectionHeading";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { HomeRowLead } from "@/components/HomeRowLead";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { type MemberContribution, perMemberContributions } from "@/lib/challenge-progress";
import { describeResolvedDuel, duelMetricLabel, duelOpponentName } from "@/lib/crew-duel-format";
import {
  rangeDateKeys,
  realTotalSetsInRange,
  realTotalVolumeInRange,
  realTotalWorkoutsInRange,
} from "@/lib/crew-stats";
import { toDateKey } from "@/lib/date";
import type { Division } from "@/lib/division";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { displayWeight } from "@/lib/units";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useCrewDuelStore } from "@/store/crew-duel-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type RivalsRange = "week" | "month";
type RivalMetricKey = "totalVolume" | "totalSets" | "totalWorkouts";

const RANGES: RivalsRange[] = ["week", "month"];
const RANGE_LABEL: Record<RivalsRange, string> = { week: "THIS WEEK", month: "THIS MONTH" };

const METRICS: { key: RivalMetricKey; label: string; unit: string }[] = [
  { key: "totalVolume", label: "Volume", unit: "kg" },
  { key: "totalSets", label: "Sets", unit: "sets" },
  { key: "totalWorkouts", label: "Workouts", unit: "" },
];

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

/** The crowned leader gets the same running-gold-light treatment as a completed goal ring or the
 * War's Attack button — genuinely the one special thing on this tab, not another bordered card. */
function MvpSpotlight({ leader, division, unit }: { leader: MemberContribution; division: Division; unit: string }) {
  const isMe = leader.member.id === CURRENT_MEMBER_ID;

  return (
    <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="items-center gap-2 py-2">
      <BrandBeamFrame borderRadius={999}>
        <View style={{ padding: 3, backgroundColor: colors.neutral.background, borderRadius: 999 }}>
          <DivisionAvatarFrame source={{ uri: leader.member.avatarUrl }} division={division} size={76} />
        </View>
      </BrandBeamFrame>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="trophy" size={13} color={colors.brand.yellow} />
        <Text style={HOME_EYEBROW}>CREW MVP</Text>
      </View>
      <EditableText id="crew.rivals.mvp.name" style={HOME_ROW_TITLE}>
        {isMe ? "You" : leader.member.name}
      </EditableText>
      <View className="flex-row items-baseline gap-1">
        <NumberFlow value={leader.amount} fontSize={22} color={colors.brand.yellow} fontWeight="800" groupSeparator="," />
        {!!unit && <Text style={HOME_ROW_DETAIL}>{unit}</Text>}
      </View>
      <Text style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>Top of the crew right now — think you can take the crown?</Text>
    </Animated.View>
  );
}

function LeaderboardRow({
  contribution,
  rank,
  unit,
  division,
  canChallenge,
  onChallenge,
  isLast,
}: {
  contribution: MemberContribution;
  rank: number;
  unit: string;
  division: Division;
  canChallenge: boolean;
  onChallenge: () => void;
  isLast: boolean;
}) {
  const medal = MEDAL_COLOR[rank - 1];
  const isMe = contribution.member.id === CURRENT_MEMBER_ID;

  return (
    <View className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <HomeRowLead kind="flat">
        {medal ? (
          <Ionicons name="trophy" size={16} color={medal} />
        ) : (
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 14, color: colors.neutral.textSecondary }}>{rank}</Text>
        )}
      </HomeRowLead>
      <DivisionAvatarFrame source={{ uri: contribution.member.avatarUrl }} division={division} size={36} />
      <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18, color: isMe ? colors.brand.yellow : colors.brand.white }]} numberOfLines={1} className="flex-1">
        {isMe ? "You" : contribution.member.name}
      </Text>
      <NumberFlow value={contribution.amount} fontSize={15} color={colors.brand.yellow} fontWeight="800" groupSeparator="," />
      {canChallenge && (
        <Pressable onPress={onChallenge} hitSlop={8} className="pl-1">
          <Ionicons name="flag-outline" size={16} color={colors.brand.yellow} />
        </Pressable>
      )}
    </View>
  );
}

function DuelRow({ text, onRespond, isLast }: { text: string; onRespond?: (accept: boolean) => void; isLast: boolean }) {
  const awaitingMyResponse = onRespond !== undefined;

  return (
    <View className={`gap-2 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <View className="flex-row items-center gap-3">
        <HomeRowLead kind="flat">
          <Ionicons name="flag" size={16} color={colors.brand.yellow} />
        </HomeRowLead>
        <Text className="body-sm flex-1 text-text-primary">{text}</Text>
      </View>
      {awaitingMyResponse && (
        <View className="flex-row gap-2 pl-[56px]">
          <Pressable onPress={() => onRespond(true)} className="flex-1 items-center rounded-full bg-brand-yellow py-2">
            <Text className="caption font-body-bold text-brand-iron">Accept</Text>
          </Pressable>
          <Pressable onPress={() => onRespond(false)} className="flex-1 items-center rounded-full bg-background py-2">
            <Text className="caption font-body-semibold text-text-secondary">Decline</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Member-vs-member competition within the crew — a weekly/monthly leaderboard (via
 * perMemberContributions) crowning a "Crew MVP", plus 1-on-1 Peer Duels (crew-duel-store) so any two
 * members can settle a "most volume/sets today" bet directly from their leaderboard row. Distinct
 * from the Challenges tab (whole crew vs. a target, or crew vs. crew) and War tab (crew vs. crew) —
 * this is the only place members compete against each other. Rebuilt on the same flowing, no-boxed-
 * cards system as the rest of Crew: real Reacticx `segmented-control` switchers, hairline-divided
 * rows instead of a bordered card per row, and a `BrandBeamFrame` MVP spotlight instead of a flat
 * tinted box. */
export function CrewRivalsTab() {
  const [range, setRange] = useState<RivalsRange>("week");
  const [metricKey, setMetricKey] = useState<RivalMetricKey>("totalVolume");
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const { user } = useUser();
  const weightUnit = useWeightUnit();
  const members = useCrewStore((state) => state.members);
  const myWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const memberActivityLookup = (memberId: string) => membersActivity[memberId] ?? { recentWorkouts: [], records: {} };
  const myDivision = useProfileLevelStore((state) => state.division);

  const duels = useCrewDuelStore((state) => state.duels);
  const fetchDuels = useCrewDuelStore((state) => state.fetch);
  const proposeDuel = useCrewDuelStore((state) => state.propose);
  const respondToDuel = useCrewDuelStore((state) => state.respond);

  useEffect(() => {
    fetchDuels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const challengingMember = members.find((member) => member.id === challengingId) ?? null;

  async function handleChallenge(metric: DuelMetric) {
    if (!challengingId) return;
    setChallengingId(null);
    const result = await proposeDuel(challengingId, metric, toDateKey(new Date()));
    if (!result.ok) Alert.alert("Couldn't send challenge", result.error);
  }

  async function handleRespond(duelId: string, accept: boolean) {
    const result = await respondToDuel(duelId, accept);
    if (!result.ok) Alert.alert("Couldn't respond", result.error);
  }

  function divisionFor(memberId: string, fallback: Division): Division {
    return memberId === CURRENT_MEMBER_ID ? myDivision : fallback;
  }

  const { startKey, endKey } = rangeDateKeys(range);
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const myContribution =
    metricKey === "totalSets"
      ? realTotalSetsInRange(myWorkouts, startKey, endKey)
      : metricKey === "totalWorkouts"
        ? realTotalWorkoutsInRange(myWorkouts, startKey, endKey)
        : realTotalVolumeInRange(myWorkouts, startKey, endKey);

  const rawLeaderboard = perMemberContributions({ type: metricKey }, members, myContribution, startKey, endKey, memberActivityLookup);
  // Volume is stored in kg regardless of unit — convert to the user's current display preference;
  // other metrics (sets, workouts) are unit-less counts and pass through untouched.
  const leaderboard =
    metricKey === "totalVolume"
      ? rawLeaderboard.map((entry) => ({ ...entry, amount: displayWeight(entry.amount, weightUnit) }))
      : rawLeaderboard;
  const metricUnit = metricKey === "totalVolume" ? weightUnit : metric.unit;
  const leader = leaderboard[0];

  // The leader's share ring — same `CircularProgress` language every other tab now uses, here
  // showing how much of the CREW's combined total the leader alone represents.
  const leaderboardTotal = leaderboard.reduce((sum, entry) => sum + entry.amount, 0);
  const leaderSharePercent = leader && leaderboardTotal > 0 ? Math.round((leader.amount / leaderboardTotal) * 100) : 0;
  const leaderShareProgress = useSharedValue(0);
  useEffect(() => {
    leaderShareProgress.value = withTiming(leaderSharePercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [leaderSharePercent, leaderShareProgress]);

  const myDuels = duels.filter((duel) => duel.challengerId === user?.id || duel.opponentId === user?.id);

  return (
    <View className="mx-4 mt-4 gap-8">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={HOME_SECTION_TITLE}>RIVALRY</Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flash" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary">Every member for themselves. Bragging rights included.</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="gap-2">
        <CrewSwitcher options={RANGES} labels={RANGE_LABEL} value={range} onChange={setRange} />
        <CrewSwitcher
          options={METRICS.map((m) => m.key)}
          labels={Object.fromEntries(METRICS.map((m) => [m.key, m.label.toUpperCase()])) as Record<RivalMetricKey, string>}
          value={metricKey}
          onChange={setMetricKey}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <SectionHeading id="crew.rivals.leaderboard" eyebrow={`${RANGE_LABEL[range]} · ${metric.label.toUpperCase()}`} title="Leaderboard" size={26} />
          {leader && leader.amount > 0 && (
            <View style={{ width: 56, height: 56 }} className="items-center justify-center">
              <CircularProgress
                progress={leaderShareProgress}
                size={56}
                strokeWidth={5}
                gap={0}
                outerCircleColor={colors.neutral.divider}
                progressCircleColor={colors.brand.yellow}
                backgroundColor="transparent"
                renderIcon={() => <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.brand.white }}>{`${leaderSharePercent}%`}</Text>}
              />
            </View>
          )}
        </View>

        {leader && leader.amount > 0 && <MvpSpotlight leader={leader} division={divisionFor(leader.member.id, leader.member.division)} unit={metricUnit} />}

        <View>
          {leaderboard.map((contribution, index) => (
            <LeaderboardRow
              key={contribution.member.id}
              contribution={contribution}
              rank={index + 1}
              unit={metricUnit}
              division={divisionFor(contribution.member.id, contribution.member.division)}
              canChallenge={contribution.member.id !== CURRENT_MEMBER_ID}
              onChallenge={() => setChallengingId(contribution.member.id)}
              isLast={index === leaderboard.length - 1}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(240).springify().damping(16).mass(0.6)} className="gap-3">
        <SectionHeading id="crew.rivals.duels" eyebrow="1-on-1" title="Peer Duels" size={26} />

        {myDuels.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Ionicons name="flag-outline" size={24} color={colors.neutral.textSecondary} />
            <Text style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>No duels yet — tap the flag next to a crewmate above to challenge them 1-on-1.</Text>
          </View>
        ) : (
          <View>
            {myDuels.map((duel, index) =>
              duel.status === "pending" && duel.opponentId === user?.id ? (
                <DuelRow
                  key={duel.id}
                  text={`${duel.challengerName} challenged you — most ${duelMetricLabel(duel)} today`}
                  onRespond={(accept) => handleRespond(duel.id, accept)}
                  isLast={index === myDuels.length - 1}
                />
              ) : duel.status === "pending" ? (
                <DuelRow
                  key={duel.id}
                  text={`Waiting for ${duelOpponentName(duel, user?.id)} to respond — most ${duelMetricLabel(duel)} today`}
                  isLast={index === myDuels.length - 1}
                />
              ) : (
                <DuelRow key={duel.id} text={describeResolvedDuel(duel, user?.id)} isLast={index === myDuels.length - 1} />
              ),
            )}
          </View>
        )}
      </Animated.View>

      <DuelChallengeSheet
        visible={challengingId !== null}
        memberName={challengingMember?.name ?? null}
        onClose={() => setChallengingId(null)}
        onChallenge={handleChallenge}
      />
    </View>
  );
}
