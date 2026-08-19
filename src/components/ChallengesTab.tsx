import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ChallengeCard } from "@/components/ChallengeCard";
import { CreateChallengeModal } from "@/components/CreateChallengeModal";
import { activeWeeklyChallenges, CHALLENGE_XP_REWARD, upcomingWeeklyChallenges, type ChallengeTemplate } from "@/data/challenges";
import { generateMemberWorkoutSessions } from "@/data/workout-log";
import { crewChallengeProgress, weekKeyRange } from "@/lib/challenge-progress";
import { currentWeekKey, fromDateKey, toDateKey } from "@/lib/date";
import { useChallengeStore } from "@/store/challenge-store";
import { useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCOPES = ["Active", "Upcoming", "Completed"] as const;
type Scope = (typeof SCOPES)[number];

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function formatTimeLeft(endsAt: number, isComplete: boolean): string {
  if (isComplete) return "Challenge complete";
  const daysLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / DAY_MS));
  if (daysLeft === 0) return "Ends today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}

function formatStartsIn(startsAt: number): string {
  const daysUntil = Math.max(0, Math.ceil((startsAt - Date.now()) / DAY_MS));
  if (daysUntil === 0) return "Starts today";
  return `Starts in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
}

export function ChallengesTab() {
  const [scope, setScope] = useState<Scope>("Active");
  const [createOpen, setCreateOpen] = useState(false);

  const members = useCrewStore((state) => state.members);
  const crewName = useCrewStore((state) => state.name);
  const addXp = useCrewStore((state) => state.addXp);
  const progress = useChallengeStore((state) => state.progress);
  const awardedIds = useChallengeStore((state) => state.awardedIds);
  const customChallenges = useChallengeStore((state) => state.customChallenges);
  const markAwarded = useChallengeStore((state) => state.markAwarded);
  const createCustomChallenge = useChallengeStore((state) => state.createCustomChallenge);

  const weekKey = currentWeekKey();
  const { startKey, endKey } = weekKeyRange(weekKey);
  const weekEndsAt = fromDateKey(endKey).getTime() + DAY_MS - 1;

  const weekly = activeWeeklyChallenges(weekKey).map((challenge) => {
    const myContribution = progress[challenge.instanceId] ?? 0;
    const target = challenge.perMemberTarget * members.length;
    const total = crewChallengeProgress(challenge.metric, members, myContribution, startKey, endKey, generateMemberWorkoutSessions);
    const isComplete = total >= target || Date.now() > weekEndsAt;
    return {
      key: challenge.instanceId,
      metric: challenge.metric,
      name: challenge.name,
      unit: challenge.unit,
      progress: total,
      target,
      isComplete,
      xpReward: CHALLENGE_XP_REWARD,
      timeLabel: formatTimeLeft(weekEndsAt, isComplete),
      instanceId: challenge.instanceId,
    };
  });

  const custom = customChallenges.map((challenge) => {
    const myContribution = progress[challenge.id] ?? 0;
    const startKeyC = toDateKey(new Date(challenge.startedAt));
    const endKeyC = toDateKey(new Date(challenge.endsAt));
    const total = crewChallengeProgress(challenge.metric, members, myContribution, startKeyC, endKeyC, generateMemberWorkoutSessions);
    const isComplete = total >= challenge.target || Date.now() > challenge.endsAt;
    return {
      key: challenge.id,
      metric: challenge.metric,
      name: challenge.name,
      unit: challenge.unit,
      progress: total,
      target: challenge.target,
      isComplete,
      xpReward: CHALLENGE_XP_REWARD,
      timeLabel: formatTimeLeft(challenge.endsAt, isComplete),
    };
  });

  const upcoming = upcomingWeeklyChallenges(2, weekKey).flatMap(({ weekKey: futureWeekKey, challenges }) => {
    const startsAt = fromDateKey(futureWeekKey).getTime();
    return challenges.map((challenge) => ({
      key: challenge.instanceId,
      metric: challenge.metric,
      name: challenge.name,
      unit: challenge.unit,
      progress: 0,
      target: challenge.perMemberTarget * members.length,
      isComplete: false,
      xpReward: CHALLENGE_XP_REWARD,
      timeLabel: formatStartsIn(startsAt),
    }));
  });

  // Every challenge (weekly or crew-vs-crew) awards crew XP once, the first time it's detected complete.
  useEffect(() => {
    for (const challenge of [...weekly, ...custom]) {
      if (challenge.isComplete && !awardedIds.includes(challenge.key)) {
        addXp(CHALLENGE_XP_REWARD);
        markAwarded(challenge.key);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [[...weekly, ...custom].map((challenge) => `${challenge.key}:${challenge.isComplete}`).join(",")]);

  const visible = scope === "Active" ? [...weekly, ...custom].filter((c) => !c.isComplete) : scope === "Upcoming" ? upcoming : [...weekly, ...custom].filter((c) => c.isComplete);

  function handleCreate(template: ChallengeTemplate, opponentCrewName: string, durationDays: number) {
    createCustomChallenge({
      opponentCrewName,
      name: template.name,
      description: `${crewName} vs ${opponentCrewName} — ${template.description}`,
      metric: template.metric,
      unit: template.unit,
      target: template.perMemberTarget * members.length,
      endsAt: Date.now() + durationDays * DAY_MS,
    });
  }

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={headerStyle} className="text-brand-white">
          {scope === "Upcoming" ? "WHAT'S COMING" : scope === "Completed" ? "VICTORIES" : "PROVE YOURSELVES"}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flame" size={13} color={colors.semantic.streak} />
          <Text className="caption font-body-semibold text-text-secondary">
            {scope === "Active" && "Every rep counts toward the crew. No excuses."}
            {scope === "Upcoming" && "Get ready — these drop soon."}
            {scope === "Completed" && "Battles won. Wear it."}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)}
        className="flex-row rounded-full border border-divider bg-surface p-1"
      >
        {SCOPES.map((s) => {
          const active = s === scope;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
            >
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{s}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)}>
        <Pressable
          onPress={() => setCreateOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-yellow py-3.5"
        >
          <Ionicons name="flag" size={16} color={colors.brand.yellow} />
          <Text className="body-sm font-body-semibold text-brand-yellow">Challenge Another Crew</Text>
        </Pressable>
      </Animated.View>

      {visible.length === 0 ? (
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(16).mass(0.6)}
          className="items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-12"
        >
          <Ionicons name={scope === "Completed" ? "trophy-outline" : "flag-outline"} size={26} color={colors.neutral.textSecondary} />
          <Text className="body-sm text-center text-text-secondary">
            {scope === "Active" && "No active challenges right now — check back Monday."}
            {scope === "Upcoming" && "Nothing scheduled yet."}
            {scope === "Completed" && "No completed challenges yet."}
          </Text>
        </Animated.View>
      ) : (
        <View className="gap-3">
          {visible.map((challenge, index) => (
            <Animated.View key={challenge.key} entering={FadeInUp.delay(180 + index * 60).springify().damping(16).mass(0.6)}>
              <ChallengeCard
                metric={challenge.metric}
                name={challenge.name}
                unit={challenge.unit}
                progress={challenge.progress}
                target={challenge.target}
                timeLabel={challenge.timeLabel}
                isComplete={challenge.isComplete}
                xpReward={challenge.xpReward}
                onPress={() => router.push(`/crew/challenge/${challenge.key}`)}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <CreateChallengeModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </View>
  );
}
