import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { useCountdown } from "@/hooks/use-countdown";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatShortAgo } from "@/lib/time-since";
import { formatWeight } from "@/lib/units";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { TOKENS_PER_BATTLE_WIN, useCurrencyStore } from "@/store/currency-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { colors, fontFamily } from "@/theme";

/** Bonus crew XP for actually winning a War — same shape/value as ChallengesTab's BATTLE_WIN_XP_BONUS. */
const WAR_WIN_XP_BONUS = 200;
/** Below this much time left, the subtitle switches from flavor text to concrete urgency framing. */
const URGENCY_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

export function CrewWarTab() {
  const war = useCrewWarStore((state) => state.war);
  const loading = useCrewWarStore((state) => state.loading);
  const rewardedWarIds = useCrewWarStore((state) => state.rewardedWarIds);
  const refresh = useCrewWarStore((state) => state.refresh);
  const startWar = useCrewWarStore((state) => state.startWar);
  const markRewarded = useCrewWarStore((state) => state.markRewarded);

  const crewName = useCrewStore((state) => state.name);
  const crewIcon = useCrewStore((state) => state.icon);
  const crewDivision = useCrewStore((state) => state.division);
  const warAutoMatchEnabled = useCrewStore((state) => state.warAutoMatchEnabled);
  const addCrewXp = useCrewStore((state) => state.addXp);
  const myRole = useCrewStore((state) => state.members.find((member) => member.id === CURRENT_MEMBER_ID)?.role);
  const canStartWar = myRole === "leader" || myRole === "co-leader";
  const grantTokens = useCurrencyStore((state) => state.grantTokens);
  const weightUnit = useWeightUnit();

  const [startingWar, setStartingWar] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStartWar() {
    setStartingWar(true);
    setStartError(null);
    const result = await startWar();
    setStartingWar(false);
    if (!result.ok) setStartError(result.error);
  }

  const remainingSeconds = useCountdown(war?.status === "active" ? war.endsAt : null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grants the win bonus exactly once per War, the first time any device notices it was actually won.
  useEffect(() => {
    if (war && war.status === "completed" && war.won === true && !rewardedWarIds.includes(war.id)) {
      addCrewXp(WAR_WIN_XP_BONUS, `war:${war.id}`);
      grantTokens(TOKENS_PER_BATTLE_WIN);
      markRewarded(war.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [war?.id, war?.status, war?.won]);

  const maxScore = war ? Math.max(war.myScore, war.opponentScore, 1) : 1;
  const remainingMs = remainingSeconds * 1000;
  const isBehind = !!war && war.status === "active" && war.myScore < war.opponentScore;
  const isUrgent = isBehind && remainingMs > 0 && remainingMs < URGENCY_THRESHOLD_MS;

  const todayStart = Date.now() - (Date.now() % DAY_MS);
  const todaysAttackCount = war?.recentAttacks.filter((attack) => attack.isMine && attack.attackedAt >= todayStart).length ?? 0;

  const subtitle =
    isUrgent && war
      ? `${formatCountdown(remainingSeconds)} — down ${formatWeight(war.opponentScore - war.myScore, weightUnit)}. One strong attack swings this.`
      : war?.status === "active"
        ? "Every rep counts. Don't let them catch up."
        : "Real crew. Real stakes. A few days to prove it.";

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text style={headerStyle} className="text-brand-white">
            CREW WAR
          </Text>
          {war?.status === "active" && (
            <Text className="caption font-body-semibold text-text-secondary">Today: {todaysAttackCount} attack{todaysAttackCount === 1 ? "" : "s"}</Text>
          )}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flame" size={13} color={isUrgent ? colors.semantic.error : colors.semantic.streak} />
          <Text className={`caption font-body-semibold ${isUrgent ? "text-error" : "text-text-secondary"}`}>{subtitle}</Text>
        </View>
      </Animated.View>

      {!war && loading ? (
        <ActivityIndicator color={colors.brand.yellow} />
      ) : !war ? (
        <Animated.View
          entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)}
          className="items-center gap-3 rounded-2xl border border-dashed border-divider bg-surface p-6"
        >
          <Ionicons name="shield-outline" size={26} color={colors.neutral.textSecondary} />
          <Text className="body-md text-center text-text-primary">No active War right now.</Text>
          <Text className="body-sm text-center text-text-secondary">
            {canStartWar
              ? "Auto-match is off in Crew Settings. Start one whenever your crew's ready."
              : "Auto-match is off — ask your leader or co-leader to start one in Crew Settings."}
          </Text>
          {canStartWar && (
            <Pressable
              onPress={handleStartWar}
              disabled={startingWar}
              className="mt-1 items-center rounded-full bg-brand-yellow px-6 py-3"
              style={{ opacity: startingWar ? 0.7 : 1 }}
            >
              <Text className="body-md font-body-bold text-brand-iron">{startingWar ? "Starting…" : "Start War"}</Text>
            </Pressable>
          )}
          {startError && <Text className="body-sm text-center text-error">{startError}</Text>}
        </Animated.View>
      ) : war.status === "active" ? (
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
                <Text className="caption font-body-semibold text-text-primary">{formatWeight(war.myScore, weightUnit)}</Text>
              </View>
              <ProgressBar ratio={war.myScore / maxScore} color={colors.brand.yellow} height={8} />
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="caption text-text-secondary">{war.opponent.name}</Text>
                <Text className="caption font-body-semibold text-text-primary">{formatWeight(war.opponentScore, weightUnit)}</Text>
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
                  <Text className="body-sm font-body-bold text-brand-yellow">{formatWeight(contributor.volumeKg, weightUnit)}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)}
          className={`items-center gap-2 rounded-2xl border p-5 ${war.won === true ? "border-success bg-success/10" : "border-divider bg-surface"}`}
        >
          <Ionicons
            name={war.won === true ? "trophy" : war.won === false ? "sad-outline" : "remove-circle-outline"}
            size={28}
            color={war.won === true ? colors.semantic.success : colors.neutral.textSecondary}
          />
          <Text className="heading-4 text-text-primary">{war.won === true ? "War Won!" : war.won === false ? "War Lost" : "It's a Draw"}</Text>
          <Text className="body-sm text-center text-text-secondary">
            {crewName} · {formatWeight(war.myScore, weightUnit)} vs {war.opponent.name} · {formatWeight(war.opponentScore, weightUnit)}
          </Text>
          <Text className="caption text-center text-text-secondary">
            {warAutoMatchEnabled ? "A new War starts automatically." : "Auto-match is off — come back to this tab to start the next one when ready."}
          </Text>
        </Animated.View>
      )}

      {war && war.recentAttacks.length > 0 && (
        <Animated.View entering={FadeInUp.delay(160).springify().damping(16).mass(0.6)} className="gap-2.5 rounded-2xl border border-divider bg-surface p-4">
          <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
            ATTACK LOG
          </Text>
          <View className="gap-2.5">
            {war.recentAttacks.map((attack, index) => (
              <View key={`${attack.attackedAt}-${index}`} className="flex-row items-center gap-2.5">
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: attack.isMine ? `${colors.brand.yellow}26` : `${colors.neutral.textSecondary}26` }}
                >
                  <Ionicons name="flash" size={13} color={attack.isMine ? colors.brand.yellow : colors.neutral.textSecondary} />
                </View>
                <Text className="body-sm flex-1 text-text-secondary" numberOfLines={1}>
                  <Text className="font-body-semibold text-text-primary">{attack.attackerName}</Text>
                  {attack.workoutName ? ` attacked with ${attack.workoutName}` : " attacked"}
                  {attack.prCount > 0 ? " 🔥" : ""}
                </Text>
                <Text className="caption font-body-bold" style={{ color: attack.isMine ? colors.brand.yellow : colors.neutral.textSecondary }}>
                  +{Math.round(attack.score).toLocaleString("en-US")}
                </Text>
                <Text className="caption text-text-secondary">{formatShortAgo(attack.attackedAt)}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
