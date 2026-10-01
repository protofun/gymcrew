import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { DivisionBadge } from "@/components/DivisionBadge";
import { GaugeArc } from "@/components/GaugeArc";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { nextDivision, xpRequiredFor } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

/** "bij crew is het niet meer zo uitnodigend om op de members bijv te drukken of crew power maak dit
 * meer kenbaar" — the old version was plain text with no hint it was tappable at all. A trailing
 * chevron (the app's own "this row goes somewhere" convention, see `HomeRowLead`) plus a real pressed
 * state (the whole row dims and its background tints, not just a bare opacity flicker on the text)
 * makes both rows read as controls, not labels, without boxing them — still no card, still Nutrition's
 * own boxless language. */
function LegendRow({ color, label, value, onPress }: { color: string; label: string; value: number; onPress?: () => void }) {
  const content = (
    <View className="flex-row items-center gap-3">
      <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: color }} />
      <View className="gap-0.5">
        <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
        <NumberFlow value={value} fontSize={16} color={colors.brand.white} fontWeight="800" groupSeparator="," />
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ borderRadius: 12, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6 }, pressed && { backgroundColor: colors.neutral.surfaceElevated, opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

/** Crew's own "day at a glance" — division progress as a `GaugeArc` (an open half-circle, not a
 * closed ring) with a legend beside it and a cycling caption underneath. The original version used a
 * full `CircularProgress` ring here, the exact same device the complaint about Home's rings ("ik zeg
 * toch dat ik van die ringen af wil") applies to just as much — Crew's hero is the next most
 * prominent ring in the app after Home's, so it gets the same "voor de afwisseling in de rest van de
 * app" treatment, not just Home. Division, Crew Power and Members used to be three separate flat
 * cards in a `tilt-carousel`; here they're one gauge plus two legend rows, the same "one glance, one
 * shape" composition Nutrition's own `DiaryRings` established for its four numbers. */
export function CrewOverviewHero() {
  const division = useCrewStore((state) => state.division);
  const globalRank = useCrewStore((state) => state.globalRank);
  const region = useCrewStore((state) => state.region);
  const xp = useCrewStore((state) => state.xp);
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewPowerChangePercent = useCrewStore((state) => state.crewPowerChangePercent);
  const members = useCrewStore((state) => state.members);

  const xpNeeded = xpRequiredFor(division);
  const ratio = Number.isFinite(xpNeeded) ? xp / xpNeeded : 1;
  const upNext = nextDivision(division);
  const xpToGo = Math.max(0, xpNeeded - xp);

  const messages = [
    upNext ? `${xpToGo.toLocaleString("en-US")} XP TO ${upNext.toUpperCase()}` : "TOP DIVISION REACHED",
    `${crewPowerChangePercent >= 0 ? "+" : ""}${crewPowerChangePercent}% POWER THIS WEEK`,
    `#${globalRank} IN ${region.toUpperCase()}`,
  ];
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setMessageIndex((index) => (index + 1) % messages.length), 3400);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center gap-5">
      <View className="w-full flex-row items-center justify-between">
        <GaugeArc fraction={ratio} size={160} strokeWidth={12} color={colors.brand.yellow}>
          <DivisionBadge division={division} size={70} />
        </GaugeArc>

        <View className="gap-3.5">
          <LegendRow color={colors.brand.yellow} label="CREW POWER" value={crewPower} onPress={() => router.push("/crew/leaderboard")} />
          <LegendRow color={colors.neutral.textSecondary} label="MEMBERS" value={members.length} onPress={() => router.push("/crew/members")} />
        </View>
      </View>

      <View style={{ minHeight: 26 }} className="items-center justify-center">
        <AnimatedText
          text={messages[messageIndex % messages.length]}
          animationConfig={{ characterDelay: 14 }}
          enterFrom={{ translateY: 18, scale: 0.5 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 18, letterSpacing: 1.2, color: colors.neutral.textSecondary }}
        />
      </View>
    </Animated.View>
  );
}
