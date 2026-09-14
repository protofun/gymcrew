import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Fragment, useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { goBack } from "@/lib/navigation";
import { EditableText } from "@/components/EditableText";
import { RankBadge } from "@/components/RankBadge";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { fromDateKey } from "@/lib/date";
import {
  crewLiftStandings,
  nearestRival,
  pairedProgressionHistory,
  type CrewLiftStanding,
  type PairedProgressionPoint,
} from "@/lib/crew-lift-compare";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { formatRankTier, RANK_TIER_COLOR, type RankProfile } from "@/lib/rank";
import { displayWeight, formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/store/active-workout-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors } from "@/theme";

function formatDaysAgo(days: number | null): string {
  if (days === null) return "Not logged yet";
  if (days <= 0) return "Today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function CompareColumn({ standing, weightUnit }: { standing: CrewLiftStanding; weightUnit: WeightUnit }) {
  const tint = RANK_TIER_COLOR[standing.tier];
  const percent = Math.round(standing.percentileInTier * 100);

  return (
    <View className="flex-1 items-center gap-2">
      {standing.avatarUrl ? (
        <Image source={{ uri: standing.avatarUrl }} className="bg-divider" style={{ width: 40, height: 40, borderRadius: 20 }} />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-divider">
          <Ionicons name="person" size={18} color={colors.neutral.textSecondary} />
        </View>
      )}
      <EditableText id={`ranks.compare.${standing.id}.name`} className="body-sm font-body-semibold text-text-primary" numberOfLines={1}>
        {standing.isMe ? "You" : standing.name}
      </EditableText>

      <RankBadge tier={standing.tier} size={80} />
      <EditableText id={`ranks.compare.${standing.id}.tier`} className="heading-4" style={{ color: tint }}>
        {formatRankTier(standing.tier)}
      </EditableText>
      <EditableText id={`ranks.compare.${standing.id}.weight`} className="body-md font-body-bold text-text-primary">
        {formatWeight(standing.weightKg, weightUnit)}
      </EditableText>
      <EditableText id={`ranks.compare.${standing.id}.percent`} className="caption text-text-secondary">
        {`${percent}%`}
      </EditableText>
    </View>
  );
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const CHART_PADDING = 12;
const CHART_Y_AXIS_WIDTH = 30;
const CHART_PLOT_WIDTH = CHART_WIDTH - CHART_Y_AXIS_WIDTH;
const CHART_Y_TICKS = 3;

function formatDateShort(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Two overlaid lines — mine (brand yellow) vs theirs (info blue) — on a shared kg/time axis. */
function ProgressionChart({ points, myName, theirName }: { points: PairedProgressionPoint[]; myName: string; theirName: string }) {
  const theirColor = colors.semantic.info;
  const allValues = points.flatMap((point) => [point.mineKg, point.theirsKg]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(1, max - min);
  const stepX = CHART_PLOT_WIDTH / (points.length - 1);

  function yFor(value: number): number {
    return CHART_HEIGHT - CHART_PADDING - ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
  }

  const myCoords = points.map((point, index) => ({ x: CHART_Y_AXIS_WIDTH + index * stepX, y: yFor(point.mineKg) }));
  const theirCoords = points.map((point, index) => ({ x: CHART_Y_AXIS_WIDTH + index * stepX, y: yFor(point.theirsKg) }));
  const toPath = (coords: { x: number; y: number }[]) => coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  const yTicks = Array.from({ length: CHART_Y_TICKS }, (_, i) => {
    const value = Math.round(max - (range * i) / (CHART_Y_TICKS - 1));
    return { value, y: yFor(value) };
  });

  const xAxisIndices = points.length >= 3 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1];

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand.yellow }} />
          <Text className="caption font-body-semibold text-text-secondary">{myName}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theirColor }} />
          <Text className="caption font-body-semibold text-text-secondary">{theirName}</Text>
        </View>
      </View>

      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {yTicks.map((tick, index) => (
          <Fragment key={index}>
            <Line
              x1={CHART_Y_AXIS_WIDTH}
              y1={tick.y}
              x2={CHART_WIDTH}
              y2={tick.y}
              stroke={colors.neutral.divider}
              strokeWidth={1}
              strokeDasharray="2,4"
            />
            <SvgText x={CHART_Y_AXIS_WIDTH - 6} y={tick.y + 3} fontSize={9} fill={colors.neutral.textSecondary} textAnchor="end">
              {tick.value}
            </SvgText>
          </Fragment>
        ))}

        <Path d={toPath(theirCoords)} stroke={theirColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Path
          d={toPath(myCoords)}
          stroke={colors.brand.yellow}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {theirCoords.map((c, index) => (
          <Circle key={`theirs-${index}`} cx={c.x} cy={c.y} r={3} fill={theirColor} />
        ))}
        {myCoords.map((c, index) => (
          <Circle key={`mine-${index}`} cx={c.x} cy={c.y} r={3} fill={colors.brand.yellow} />
        ))}
      </Svg>

      <View className="flex-row justify-between" style={{ paddingLeft: CHART_Y_AXIS_WIDTH }}>
        {xAxisIndices.map((index) => (
          <Text key={index} className="caption text-text-secondary">
            {formatDateShort(points[index].date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function CompareRow({
  label,
  mine,
  theirs,
  unit = "",
  isLast = false,
}: {
  label: string;
  mine: string;
  theirs: string;
  unit?: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <Text className="body-sm flex-1 text-text-primary">
        {mine}
        {unit}
      </Text>
      <Text className="caption flex-[1.2] text-center text-text-secondary">{label}</Text>
      <Text className="body-sm flex-1 text-right text-text-primary">
        {theirs}
        {unit}
      </Text>
    </View>
  );
}

export default function LiftCompareScreen() {
  const insets = useSafeAreaInsets();
  const { liftId, withId } = useLocalSearchParams<{ liftId: string; withId?: string }>();

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const weightUnit = useWeightUnit();
  const records = usePersonalRecordsStore((state) => state.records);
  const crewMembers = useCrewStore((state) => state.members);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const card = cards.find((candidate) => candidate.id === liftId);

  const standings = useMemo(
    () => (card ? crewLiftStandings(card.id, card, records[card.exerciseId], crewMembers, membersActivity) : []),
    [card, records, crewMembers, membersActivity],
  );
  const me = standings.find((standing) => standing.isMe);
  const opponent = standings.find((standing) => standing.id === withId) ?? nearestRival(standings);

  const progressionPoints = useMemo(
    () => (card && me && opponent ? pairedProgressionHistory(card.id, me.weightKg, opponent.id, opponent.weightKg) : []),
    [card, me, opponent],
  );
  const displayProgressionPoints = useMemo(
    () =>
      progressionPoints.map((point) => ({
        ...point,
        mineKg: displayWeight(point.mineKg, weightUnit),
        theirsKg: displayWeight(point.theirsKg, weightUnit),
      })),
    [progressionPoints, weightUnit],
  );

  if (!card || !me || !opponent) {
    router.replace(card ? `/ranks/${card.id}` : "/(tabs)/ranks");
    return null;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/ranks")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{card.name}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
          <CompareColumn standing={me} weightUnit={weightUnit} />
          <Text className="body-lg font-body-bold text-text-secondary">VS</Text>
          <CompareColumn standing={opponent} weightUnit={weightUnit} />
        </View>

        <View className="rounded-2xl border border-divider bg-surface p-4">
          <CompareRow label="Power Score" mine={me.score.toLocaleString("en-US")} theirs={opponent.score.toLocaleString("en-US")} />
          <CompareRow
            label="Best Set (1RM)"
            mine={`${displayWeight(me.weightKg, weightUnit)}`}
            theirs={`${displayWeight(opponent.weightKg, weightUnit)}`}
            unit={` ${weightUnit}`}
          />
          <CompareRow label="Percentile" mine={`${Math.round(me.percentileInTier * 100)}`} theirs={`${Math.round(opponent.percentileInTier * 100)}`} unit="%" />
          <CompareRow label="Last logged" mine={formatDaysAgo(me.daysSinceLogged)} theirs={formatDaysAgo(opponent.daysSinceLogged)} isLast />
        </View>

        <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
          <Text className="body-md font-body-semibold text-text-primary">Progress Over Time</Text>
          <ProgressionChart points={displayProgressionPoints} myName="You" theirName={opponent.name} />
        </View>

        <Pressable
          onPress={() => router.push(`/crew/member/${opponent.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="items-center rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-md font-body-semibold text-brand-iron">Go to {opponent.name}&apos;s profile</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
