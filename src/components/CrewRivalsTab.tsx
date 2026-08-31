import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { type DuelMetric, DuelChallengeSheet } from "@/components/DuelChallengeSheet";
import { EditableText } from "@/components/EditableText";
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
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useCrewDuelStore } from "@/store/crew-duel-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

type RivalsRange = "week" | "month";
type RivalMetricKey = "totalVolume" | "totalSets" | "totalWorkouts";

const RANGES: { key: RivalsRange; label: string }[] = [
  { key: "week", label: "THIS WEEK" },
  { key: "month", label: "THIS MONTH" },
];

const METRICS: { key: RivalMetricKey; label: string; unit: string }[] = [
  { key: "totalVolume", label: "Volume", unit: "kg" },
  { key: "totalSets", label: "Sets", unit: "sets" },
  { key: "totalWorkouts", label: "Workouts", unit: "" },
];

const MEDAL_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see other crew tabs' identical headerStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function MvpSpotlight({ leader, division, unit }: { leader: MemberContribution; division: Division; unit: string }) {
  const isMe = leader.member.id === CURRENT_MEMBER_ID;

  return (
    <Animated.View
      entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)}
      className="items-center gap-3 rounded-3xl border border-brand-yellow/30 bg-brand-yellow/5 p-5"
    >
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="trophy" size={14} color={colors.brand.yellow} />
        <Text className="caption font-body-bold text-brand-yellow" style={{ letterSpacing: 1 }}>
          CREW MVP
        </Text>
      </View>
      <DivisionAvatarFrame source={{ uri: leader.member.avatarUrl }} division={division} size={72} />
      <EditableText id="crew.rivals.mvp.name" className="heading-4 text-text-primary">
        {isMe ? "You" : leader.member.name}
      </EditableText>
      <EditableText id="crew.rivals.mvp.amount" className="body-md font-body-bold text-brand-yellow">
        {`${leader.amount.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}`}
      </EditableText>
      <Text className="body-sm text-center text-text-secondary">Top of the crew right now — think you can take the crown?</Text>
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
}: {
  contribution: MemberContribution;
  rank: number;
  unit: string;
  division: Division;
  canChallenge: boolean;
  onChallenge: () => void;
}) {
  const medal = MEDAL_COLOR[rank - 1];
  const isMe = contribution.member.id === CURRENT_MEMBER_ID;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border p-3 ${medal ? "border-brand-yellow/30 bg-brand-yellow/5" : "border-divider bg-surface"}`}
    >
      {medal ? (
        <Ionicons name="trophy" size={16} color={medal} style={{ width: 20 }} />
      ) : (
        <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{rank}</Text>
      )}
      <DivisionAvatarFrame source={{ uri: contribution.member.avatarUrl }} division={division} size={36} />
      <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
        {isMe ? "You" : contribution.member.name}
      </Text>
      <Text className="body-sm font-body-bold text-brand-yellow">
        {contribution.amount.toLocaleString("en-US")}
        {unit ? ` ${unit}` : ""}
      </Text>
      {canChallenge && (
        <Pressable onPress={onChallenge} hitSlop={8} className="pl-1">
          <Ionicons name="flag-outline" size={16} color={colors.brand.yellow} />
        </Pressable>
      )}
    </View>
  );
}

function DuelRow({ text, onRespond }: { text: string; onRespond?: (accept: boolean) => void }) {
  const awaitingMyResponse = onRespond !== undefined;

  return (
    <View className="gap-2 rounded-2xl border border-divider bg-surface p-3">
      <Text className="body-sm text-text-primary">{text}</Text>
      {awaitingMyResponse && (
        <View className="flex-row gap-2">
          <Pressable onPress={() => onRespond(true)} className="flex-1 items-center rounded-full bg-brand-yellow py-2">
            <Text className="caption font-body-bold text-brand-iron">Accept</Text>
          </Pressable>
          <Pressable onPress={() => onRespond(false)} className="flex-1 items-center rounded-full border border-divider py-2">
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
 * this is the only place members compete against each other. */
export function CrewRivalsTab() {
  const [range, setRange] = useState<RivalsRange>("week");
  const [metricKey, setMetricKey] = useState<RivalMetricKey>("totalVolume");
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const { user } = useUser();
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

  const leaderboard = perMemberContributions({ type: metricKey }, members, myContribution, startKey, endKey, memberActivityLookup);
  const leader = leaderboard[0];

  const myDuels = duels.filter((duel) => duel.challengerId === user?.id || duel.opponentId === user?.id);

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={headerStyle} className="text-brand-white">
          RIVALRY
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flash" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary">Every member for themselves. Bragging rights included.</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="flex-row rounded-full border border-divider bg-surface p-1">
        {RANGES.map(({ key, label }) => {
          const active = key === range;
          return (
            <Pressable key={key} onPress={() => setRange(key)} className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}>
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(90).springify().damping(16).mass(0.6)} className="flex-row gap-2">
        {METRICS.map((option) => {
          const active = option.key === metricKey;
          return (
            <Pressable
              key={option.key}
              onPress={() => setMetricKey(option.key)}
              className={`flex-1 items-center rounded-full border py-2 ${active ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
            >
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      {leader && leader.amount > 0 && (
        <MvpSpotlight leader={leader} division={divisionFor(leader.member.id, leader.member.division)} unit={metric.unit} />
      )}

      <Animated.View entering={FadeInUp.delay(180).springify().damping(16).mass(0.6)} className="gap-2.5">
        {leaderboard.map((contribution, index) => (
          <LeaderboardRow
            key={contribution.member.id}
            contribution={contribution}
            rank={index + 1}
            unit={metric.unit}
            division={divisionFor(contribution.member.id, contribution.member.division)}
            canChallenge={contribution.member.id !== CURRENT_MEMBER_ID}
            onChallenge={() => setChallengingId(contribution.member.id)}
          />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(240).springify().damping(16).mass(0.6)} className="gap-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flag" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
            PEER DUELS
          </Text>
        </View>

        {myDuels.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-10">
            <Ionicons name="flag-outline" size={24} color={colors.neutral.textSecondary} />
            <Text className="body-sm text-center text-text-secondary">
              No duels yet — tap the flag next to a crewmate above to challenge them 1-on-1.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {myDuels.map((duel) =>
              duel.status === "pending" && duel.opponentId === user?.id ? (
                <DuelRow
                  key={duel.id}
                  text={`${duel.challengerName} challenged you — most ${duelMetricLabel(duel)} today`}
                  onRespond={(accept) => handleRespond(duel.id, accept)}
                />
              ) : duel.status === "pending" ? (
                <DuelRow key={duel.id} text={`Waiting for ${duelOpponentName(duel, user?.id)} to respond — most ${duelMetricLabel(duel)} today`} />
              ) : (
                <DuelRow key={duel.id} text={describeResolvedDuel(duel, user?.id)} />
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
