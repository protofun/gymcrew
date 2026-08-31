import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { useCountdown } from "@/hooks/use-countdown";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { TOKENS_PER_BATTLE_WIN, useCurrencyStore } from "@/store/currency-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { colors, fontFamily } from "@/theme";

/** Bonus crew XP for actually winning a War — same shape/value as ChallengesTab's BATTLE_WIN_XP_BONUS. */
const WAR_WIN_XP_BONUS = 200;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see ChallengesTab's headerStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "Ending…";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

function WarExplainer({ canStartWar, myDivision, joining, onJoin }: { canStartWar: boolean; myDivision: string; joining: boolean; onJoin: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-4 rounded-2xl border border-divider bg-surface p-5">
      <View className="items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-yellow/15">
          <Ionicons name="shield-half" size={26} color={colors.brand.yellow} />
        </View>
        <Text className="heading-4 text-center text-text-primary">Challenge a Real Crew</Text>
        <Text className="body-sm text-center text-text-secondary">
          Start a 3-day War against a genuine opponent crew, matched automatically to your crew&apos;s strength. Every workout your
          crew logs adds to your score — most total volume when the War ends wins.
        </Text>
      </View>

      <Pressable
        onPress={() => canStartWar && onJoin()}
        disabled={joining}
        className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${canStartWar ? "bg-brand-yellow" : "border border-dashed border-divider"}`}
      >
        {joining ? (
          <ActivityIndicator color={colors.brand.iron} />
        ) : (
          <>
            <Ionicons name={canStartWar ? "flag" : "lock-closed"} size={16} color={canStartWar ? colors.brand.iron : colors.neutral.textSecondary} />
            <Text className={`body-md font-body-bold ${canStartWar ? "text-brand-iron" : "text-text-secondary"}`}>
              {canStartWar ? "Find a War" : `Only your crew leader or co-leader can start a War (you're ${myDivision})`}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function WarSearching({ onCancel }: { onCancel: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="items-center gap-4 rounded-2xl border border-divider bg-surface p-6">
      <ActivityIndicator color={colors.brand.yellow} />
      <Text className="body-md font-body-semibold text-text-primary">Searching for an opponent…</Text>
      <Text className="body-sm text-center text-text-secondary">
        We&apos;ll match your crew the moment another crew of similar strength is looking too.
      </Text>
      <Pressable onPress={onCancel} className="rounded-full border border-divider px-4 py-2">
        <Text className="body-sm font-body-semibold text-text-secondary">Cancel</Text>
      </Pressable>
    </Animated.View>
  );
}

export function CrewWarTab() {
  const war = useCrewWarStore((state) => state.war);
  const queued = useCrewWarStore((state) => state.queued);
  const loading = useCrewWarStore((state) => state.loading);
  const rewardedWarIds = useCrewWarStore((state) => state.rewardedWarIds);
  const refresh = useCrewWarStore((state) => state.refresh);
  const joinQueue = useCrewWarStore((state) => state.joinQueue);
  const leaveQueue = useCrewWarStore((state) => state.leaveQueue);
  const markRewarded = useCrewWarStore((state) => state.markRewarded);

  const members = useCrewStore((state) => state.members);
  const crewIcon = useCrewStore((state) => state.icon);
  const crewName = useCrewStore((state) => state.name);
  const crewDivision = useCrewStore((state) => state.division);
  const addCrewXp = useCrewStore((state) => state.addXp);
  const grantTokens = useCurrencyStore((state) => state.grantTokens);

  const [joining, setJoining] = useState(false);

  const me = members.find((member) => member.id === CURRENT_MEMBER_ID);
  const canStartWar = me?.role === "leader" || me?.role === "co-leader";
  const remainingSeconds = useCountdown(war?.status === "active" ? war.endsAt : null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grants the win bonus exactly once per War, the first time any device notices it was actually
  // won — same locally-guarded pattern as ChallengesTab's battleWinAwardedIds.
  useEffect(() => {
    if (war && war.status === "completed" && war.won === true && !rewardedWarIds.includes(war.id)) {
      addCrewXp(WAR_WIN_XP_BONUS);
      grantTokens(TOKENS_PER_BATTLE_WIN);
      markRewarded(war.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [war?.id, war?.status, war?.won]);

  async function handleJoinQueue() {
    setJoining(true);
    const result = await joinQueue();
    setJoining(false);
    if (!result.ok) Alert.alert("Couldn't start a War", result.error);
  }

  const maxScore = war ? Math.max(war.myScore, war.opponentScore, 1) : 1;

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={headerStyle} className="text-brand-white">
          CREW WAR
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flame" size={13} color={colors.semantic.streak} />
          <Text className="caption font-body-semibold text-text-secondary">
            {war?.status === "active" ? "Every rep counts. Don't let them catch up." : "Real crew. Real stakes. A few days to prove it."}
          </Text>
        </View>
      </Animated.View>

      {loading && !war && !queued ? (
        <ActivityIndicator color={colors.brand.yellow} />
      ) : war?.status === "active" ? (
        <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-4 rounded-2xl border border-divider bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
              WAR IN PROGRESS
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color={colors.brand.yellow} />
              <Text className="caption font-body-semibold text-brand-yellow">{formatCountdown(remainingSeconds)}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-4">
            <View className="flex-1 items-center gap-2">
              <CrewIconBadge iconKey={crewIcon} size={56} />
              <Text className="body-sm font-body-bold text-text-primary" numberOfLines={1}>
                {crewName}
              </Text>
              <Text className="caption text-text-secondary">{crewDivision}</Text>
            </View>
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 22 }} className="text-text-secondary">
              VS
            </Text>
            <View className="flex-1 items-center gap-2">
              <CrewIconBadge iconKey={war.opponent.icon} size={56} />
              <Text className="body-sm font-body-bold text-text-primary" numberOfLines={1}>
                {war.opponent.name}
              </Text>
              <Text className="caption text-text-secondary">{war.opponent.division}</Text>
            </View>
          </View>

          <View className="gap-3">
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="caption text-text-secondary">{crewName}</Text>
                <Text className="caption font-body-semibold text-text-primary">{Math.round(war.myScore).toLocaleString("en-US")} kg</Text>
              </View>
              <ProgressBar ratio={war.myScore / maxScore} color={colors.brand.yellow} height={8} />
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="caption text-text-secondary">{war.opponent.name}</Text>
                <Text className="caption font-body-semibold text-text-primary">{Math.round(war.opponentScore).toLocaleString("en-US")} kg</Text>
              </View>
              <ProgressBar ratio={war.opponentScore / maxScore} color={colors.neutral.textSecondary} height={8} />
            </View>
          </View>

          {war.topContributors.length > 0 && (
            <View className="gap-2">
              <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
                TOP CONTRIBUTORS
              </Text>
              {war.topContributors.map((contributor, index) => (
                <View key={contributor.userId} className="flex-row items-center gap-3">
                  <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{index + 1}</Text>
                  <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
                    {contributor.name}
                  </Text>
                  <Text className="body-sm font-body-bold text-brand-yellow">{Math.round(contributor.volumeKg).toLocaleString("en-US")} kg</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      ) : war?.status === "completed" ? (
        <View className="gap-4">
          <Animated.View
            entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)}
            className={`items-center gap-2 rounded-2xl border p-5 ${
              war.won === true ? "border-success bg-success/10" : war.won === false ? "border-divider bg-surface" : "border-divider bg-surface"
            }`}
          >
            <Ionicons
              name={war.won === true ? "trophy" : war.won === false ? "sad-outline" : "remove-circle-outline"}
              size={28}
              color={war.won === true ? colors.semantic.success : colors.neutral.textSecondary}
            />
            <Text className="heading-4 text-text-primary">
              {war.won === true ? "War Won!" : war.won === false ? "War Lost" : "It's a Draw"}
            </Text>
            <Text className="body-sm text-center text-text-secondary">
              {crewName} · {Math.round(war.myScore).toLocaleString("en-US")} kg vs {war.opponent.name} ·{" "}
              {Math.round(war.opponentScore).toLocaleString("en-US")} kg
            </Text>
          </Animated.View>

          <WarExplainer canStartWar={canStartWar} myDivision={me?.division ?? "Rookie"} joining={joining} onJoin={handleJoinQueue} />
        </View>
      ) : queued ? (
        <WarSearching onCancel={leaveQueue} />
      ) : (
        <WarExplainer canStartWar={canStartWar} myDivision={me?.division ?? "Rookie"} joining={joining} onJoin={handleJoinQueue} />
      )}
    </View>
  );
}
