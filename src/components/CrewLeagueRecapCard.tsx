import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { colors, fontFamily } from "@/theme";
import type { LeagueWeekResult } from "@/store/crew-league-store";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see WorkoutShareCard/CrewWarRecapCard for the same pattern.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

const resultStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const OUTCOME_META: Record<LeagueWeekResult["outcome"], { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  promoted: { label: "PROMOTED!", icon: "arrow-up-circle", color: colors.semantic.success },
  relegated: { label: "RELEGATED", icon: "arrow-down-circle", color: colors.semantic.error },
  held: { label: "DIVISION HELD", icon: "shield-checkmark", color: colors.brand.yellow },
};

type CrewLeagueRecapCardProps = {
  result: LeagueWeekResult;
  crewName: string;
  crewIcon: string;
};

/** The "share this League week" card — same shareable-card family as `CrewWarRecapCard`/
 * `WorkoutShareCard` (see `ShareCardModal`). League has no per-member attribution the way a War's
 * attack log does, so there's no MVP slot here — the equivalent stakes-worthy number is final rank
 * and whether the crew moved divisions. */
export function CrewLeagueRecapCard({ result, crewName, crewIcon }: CrewLeagueRecapCardProps) {
  const meta = OUTCOME_META[result.outcome];

  return (
    <View className="gap-5 rounded-3xl border border-divider bg-surface p-5">
      <Text style={wordmarkStyle} className="text-center">
        <Text className="text-text-primary">GYM</Text>
        <Text className="text-brand-yellow">CREW</Text>
      </Text>

      <View className="items-center gap-2">
        <Ionicons name={meta.icon} size={30} color={meta.color} />
        <Text style={[resultStyle, { color: meta.color }]} className="text-center">
          {meta.label}
        </Text>
      </View>

      <View className="items-center gap-2">
        <CrewIconBadge iconKey={crewIcon} size={56} />
        <Text className="body-sm font-body-bold text-text-primary" numberOfLines={1}>
          {crewName}
        </Text>
      </View>

      <View className="items-center gap-1 rounded-2xl border border-divider bg-background py-3">
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          THIS WEEK&apos;S LEAGUE
        </Text>
        <Text className="heading-4 text-brand-yellow">
          #{result.myRank} of {result.totalCrews}
        </Text>
        <Text className="caption text-text-secondary">{result.division} Division</Text>
      </View>

      <Text className="caption text-center text-text-secondary">Track it. Rank it. GymCrew.</Text>
    </View>
  );
}
