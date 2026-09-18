import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import type { ApiCrewWar } from "@/lib/api";
import { formatWeight } from "@/lib/units";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see WorkoutShareCard for the same constraint/pattern.
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

type WarOutcome = "won" | "lost" | "draw";

const OUTCOME_META: Record<WarOutcome, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  won: { label: "WAR WON", icon: "trophy", color: colors.semantic.success },
  lost: { label: "WAR LOST", icon: "shield-outline", color: colors.neutral.textSecondary },
  draw: { label: "IT'S A DRAW", icon: "remove-circle-outline", color: colors.neutral.textSecondary },
};

type CrewWarRecapCardProps = {
  war: ApiCrewWar;
  crewName: string;
  crewIcon: string;
};

/** The "share this War result" card — captured to a PNG and handed to the native share sheet (see
 * `ShareCardModal`). Same flat `bg-surface` canonical card language as `WorkoutShareCard`/
 * `RankRevealCard`, so every share surface in the app looks like one family. Final score and the
 * War's top contributor (its "MVP") are the two numbers worth putting on a poster — everything else
 * on the full War tab (attack log, countdown) is process, not a result worth screenshotting. */
export function CrewWarRecapCard({ war, crewName, crewIcon }: CrewWarRecapCardProps) {
  const weightUnit = useWeightUnit();
  const outcome: WarOutcome = war.won === true ? "won" : war.won === false ? "lost" : "draw";
  const meta = OUTCOME_META[outcome];
  const mvp = war.topContributors[0];

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

      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-1 items-center gap-2">
          <CrewIconBadge iconKey={crewIcon} size={56} />
          <Text className="body-sm font-body-bold text-text-primary" numberOfLines={1}>
            {crewName}
          </Text>
          <Text className="heading-4 text-brand-yellow">{formatWeight(war.myScore, weightUnit)}</Text>
        </View>
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 20 }} className="text-text-secondary">
          VS
        </Text>
        <View className="flex-1 items-center gap-2">
          <CrewIconBadge iconKey={war.opponent.icon} size={56} />
          <Text className="body-sm font-body-bold text-text-primary" numberOfLines={1}>
            {war.opponent.name}
          </Text>
          <Text className="heading-4 text-text-secondary">{formatWeight(war.opponentScore, weightUnit)}</Text>
        </View>
      </View>

      {mvp && (
        <View className="items-center gap-1 rounded-2xl border border-divider bg-background py-3">
          <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
            CREW MVP
          </Text>
          <Text className="body-md font-body-bold text-text-primary">{mvp.name}</Text>
          <Text className="caption text-brand-yellow">{formatWeight(mvp.volumeKg, weightUnit)} contributed</Text>
        </View>
      )}

      <Text className="caption text-center text-text-secondary">Track it. Rank it. GymCrew.</Text>
    </View>
  );
}
