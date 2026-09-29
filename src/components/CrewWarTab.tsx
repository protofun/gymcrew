import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { useCountdown } from "@/hooks/use-countdown";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatShortAgo } from "@/lib/time-since";
import { displayWeight, formatWeight } from "@/lib/units";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { colors, fontFamily } from "@/theme";

/** Below this much time left, the subtitle switches from flavor text to concrete urgency framing. */
const URGENCY_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "Ending…";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

/** One side of the VS hero — no `ChromaFrame` ring (removed app-wide), just a bigger badge for
 * whichever crew currently holds the lead (`leading`), so the hero itself still says who's ahead
 * before anyone reads a number. */
function WarSide({ iconKey, name, score, leading, weightUnit }: { iconKey: string; name: string; score: number; leading: boolean; weightUnit: ReturnType<typeof useWeightUnit> }) {
  return (
    <View className="flex-1 items-center gap-2">
      <CrewIconBadge iconKey={iconKey} size={leading ? 76 : 68} />
      <Text style={HOME_ROW_DETAIL} numberOfLines={1}>
        {name}
      </Text>
      <NumberFlow value={displayWeight(score, weightUnit)} fontSize={22} color={colors.brand.white} fontWeight="800" groupSeparator="," />
    </View>
  );
}

/** The Crew War tab — a live, ongoing 1v1 between crews (real attacks, real scores, a real
 * countdown; see `useCrewWarStore`), rebuilt on the same flowing-list, no-boxed-cards system as the
 * rest of Crew: a VS hero (a bigger badge for whoever's ahead, no `ChromaFrame` ring — removed app-
 * wide) instead of two plain equal-size badges, one tug-of-war `AnimatedProgressBar` sized to each
 * side's share instead of two separate bars, `number-flow` for every score so a new attack visibly
 * rolls the digits rather than just replacing text, and the attack log entering one row at a time
 * instead of appearing at once. */
export function CrewWarTab() {
  const war = useCrewWarStore((state) => state.war);
  const loading = useCrewWarStore((state) => state.loading);
  const refresh = useCrewWarStore((state) => state.refresh);
  const startWar = useCrewWarStore((state) => state.startWar);

  const crewName = useCrewStore((state) => state.name);
  const crewIcon = useCrewStore((state) => state.icon);
  const myRole = useCrewStore((state) => state.members.find((member) => member.id === CURRENT_MEMBER_ID)?.role);
  const canStartWar = myRole === "leader" || myRole === "co-leader";
  const weightUnit = useWeightUnit();
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const posthog = usePostHog();

  const [startingWar, setStartingWar] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStartWar() {
    setStartingWar(true);
    setStartError(null);
    const result = await startWar();
    setStartingWar(false);
    if (!result.ok) setStartError(result.error);
  }

  // The actual function this tab was missing — everything else here is a readout. One tap starts
  // the workout that becomes the next attack the moment it's finished (see workout/summary.tsx's
  // `WarAttackSummary`), instead of leaving "go start a workout" as an implied, unlinked step.
  function handleAttack() {
    startWorkout();
    posthog.capture("workout_started", { source: "crew_war" });
    router.push("/workout/active");
  }

  const remainingSeconds = useCountdown(war?.status === "active" ? war.endsAt : null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = war ? war.myScore + war.opponentScore : 0;
  const share = war && total > 0 ? war.myScore / total : 0.5;
  const remainingMs = remainingSeconds * 1000;
  const isBehind = !!war && war.status === "active" && war.myScore < war.opponentScore;
  const isUrgent = isBehind && remainingMs > 0 && remainingMs < URGENCY_THRESHOLD_MS;
  const leading = !!war && war.myScore >= war.opponentScore;

  const todayStart = Date.now() - (Date.now() % DAY_MS);
  const todaysAttackCount = war?.recentAttacks.filter((attack) => attack.isMine && attack.attackedAt >= todayStart).length ?? 0;

  const subtitle =
    isUrgent && war
      ? `${formatCountdown(remainingSeconds)} — down ${formatWeight(war.opponentScore - war.myScore, weightUnit)}. One strong attack swings this.`
      : war?.status === "active"
        ? "Every rep counts. Don't let them catch up."
        : "Real crew. Real stakes. A few days to prove it.";

  return (
    <View className="mx-4 mt-4 gap-6">
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text style={HOME_SECTION_TITLE}>CREW WAR</Text>
          {war?.status === "active" && (
            <Text style={HOME_ROW_DETAIL}>{`Today: ${todaysAttackCount} attack${todaysAttackCount === 1 ? "" : "s"}`}</Text>
          )}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="flame" size={13} color={isUrgent ? colors.semantic.error : colors.semantic.streak} />
          <Text className={`caption font-body-semibold ${isUrgent ? "text-error" : "text-text-secondary"}`}>{subtitle}</Text>
        </View>
      </View>

      {!war && loading ? (
        <ActivityIndicator color={colors.brand.yellow} />
      ) : !war ? (
        <Animated.View entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)} className="items-center gap-3 py-8">
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
            <Ionicons name="shield-outline" size={36} color={colors.brand.yellow} />
          </View>
          <View className="items-center gap-1">
            <Text style={HOME_ROW_TITLE}>NO ACTIVE WAR</Text>
            <Text style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>
              {canStartWar ? "Auto-match is off in Crew Settings — start one whenever your crew's ready." : "Auto-match is off — ask your leader or co-leader to start one."}
            </Text>
          </View>
          {canStartWar && (
            <Pressable
              onPress={handleStartWar}
              disabled={startingWar}
              className="mt-1 items-center rounded-full bg-brand-yellow px-6 py-3.5"
              style={{ opacity: startingWar ? 0.7 : 1 }}
            >
              <Text className="body-md font-body-bold text-brand-iron">{startingWar ? "Starting…" : "Start War"}</Text>
            </Pressable>
          )}
          {startError && <Text className="body-sm text-center text-error">{startError}</Text>}
        </Animated.View>
      ) : war.status === "active" ? (
        <Animated.View entering={FadeInUp.delay(100).springify().damping(16).mass(0.6)} className="gap-5">
          <View className="flex-row items-center justify-center gap-4">
            <WarSide iconKey={crewIcon} name={crewName} score={war.myScore} leading={leading} weightUnit={weightUnit} />
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 1, color: colors.neutral.textSecondary }}>VS</Text>
            <WarSide iconKey={war.opponent.icon} name={war.opponent.name} score={war.opponentScore} leading={!leading} weightUnit={weightUnit} />
          </View>

          <View className="gap-1.5">
            <AnimatedProgressBar progress={share} height={8} borderRadius={4} progressColor={leading ? colors.semantic.success : colors.semantic.error} trackColor={colors.neutral.divider} animationDuration={800} />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={12} color={colors.neutral.textSecondary} />
                <Text style={HOME_ROW_DETAIL}>{formatCountdown(remainingSeconds)}</Text>
              </View>
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 12, letterSpacing: 1, color: leading ? colors.semantic.success : colors.semantic.error }}>
                {leading ? "AHEAD" : "BEHIND"}
              </Text>
            </View>
          </View>

          <BrandBeamFrame borderRadius={999}>
            <Pressable onPress={handleAttack} style={{ backgroundColor: colors.neutral.background }} className="flex-row items-center justify-center gap-2 rounded-full py-4">
              <Ionicons name="flash" size={18} color={colors.brand.yellow} />
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 1, color: colors.brand.yellow }}>ATTACK NOW</Text>
            </Pressable>
          </BrandBeamFrame>

          {war.topContributors.length > 0 && (
            <View className="gap-3 border-t border-divider pt-4">
              <Text style={HOME_EYEBROW}>TOP CONTRIBUTORS</Text>
              <View className="gap-3">
                {war.topContributors.map((contributor, index) => (
                  <View key={contributor.userId} className="flex-row items-center gap-3">
                    <HomeRowLead kind="flat">
                      <Text style={{ fontFamily: fontFamily.heading, fontSize: 14, color: index === 0 ? colors.brand.yellow : colors.neutral.textSecondary }}>{index + 1}</Text>
                    </HomeRowLead>
                    <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
                      {contributor.name}
                    </Text>
                    <NumberFlow value={displayWeight(contributor.volumeKg, weightUnit)} fontSize={16} color={colors.brand.yellow} fontWeight="800" groupSeparator="," />
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      ) : null}

      {war && war.recentAttacks.length > 0 && (
        <View className="gap-3 border-t border-divider pt-4">
          <Text style={HOME_EYEBROW}>ATTACK LOG</Text>
          <View className="gap-3">
            {war.recentAttacks.map((attack, index) => (
              <Animated.View key={`${attack.attackedAt}-${index}`} entering={FadeInDown.delay(index * 40).duration(260)} className="flex-row items-center gap-3">
                <HomeRowLead kind="flat">
                  <Ionicons name="flash" size={16} color={attack.isMine ? colors.brand.yellow : colors.neutral.textSecondary} />
                </HomeRowLead>
                <Text className="body-sm flex-1 text-text-secondary" numberOfLines={1}>
                  <Text className="font-body-semibold text-text-primary">{attack.attackerName}</Text>
                  {attack.workoutName ? ` attacked with ${attack.workoutName}` : " attacked"}
                  {attack.prCount > 0 ? " 🔥" : ""}
                </Text>
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: attack.isMine ? colors.brand.yellow : colors.neutral.textSecondary }}>
                  {`+${Math.round(attack.score).toLocaleString("en-US")}`}
                </Text>
                <Text style={HOME_ROW_DETAIL}>{formatShortAgo(attack.attackedAt)}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
