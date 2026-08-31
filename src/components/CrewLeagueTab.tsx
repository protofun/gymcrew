import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { EditableText } from "@/components/EditableText";
import { OTHER_CREWS_POWER } from "@/data/crew-leaderboard";
import {
  computeCrewWeeklyPower,
  computeLeagueStandings,
  determineLeagueOutcome,
  leagueZoneSize,
  sameDivisionRivals,
  weekKeyRange,
} from "@/lib/crew-league";
import { currentWeekKey, fromDateKey } from "@/lib/date";
import { DIVISION_COLOR } from "@/lib/division";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewLeagueStore, type LeagueWeekResult } from "@/store/crew-league-store";
import { useCrewStore } from "@/store/crew-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function daysLeftInWeek(): number {
  const { endKey } = weekKeyRange(currentWeekKey());
  const endsAt = fromDateKey(endKey).getTime() + DAY_MS - 1;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / DAY_MS));
}

const OUTCOME_META: Record<LeagueWeekResult["outcome"], { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  promoted: { label: "Promoted", icon: "arrow-up-circle", color: colors.semantic.success },
  relegated: { label: "Relegated", icon: "arrow-down-circle", color: colors.semantic.error },
  held: { label: "Held", icon: "remove-circle", color: colors.neutral.textSecondary },
};

function StandingIcon({ isMine, myCrewIcon, rivalIcon, rivalTint }: { isMine: boolean; myCrewIcon: string; rivalIcon?: string; rivalTint?: string }) {
  if (isMine) return <CrewIconBadge iconKey={myCrewIcon} size={32} />;
  return (
    <View className="items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: `${rivalTint}26` }}>
      <Ionicons name={(rivalIcon as keyof typeof Ionicons.glyphMap) ?? "flame"} size={16} color={rivalTint ?? colors.neutral.textSecondary} />
    </View>
  );
}

function StandingRow({
  id,
  rank,
  name,
  myCrewIcon,
  rivalIcon,
  rivalTint,
  weeklyPower,
  isMine,
  zone,
}: {
  id: string;
  rank: number;
  name: string;
  myCrewIcon: string;
  rivalIcon?: string;
  rivalTint?: string;
  weeklyPower: number;
  isMine: boolean;
  zone: "promotion" | "relegation" | null;
}) {
  const zoneColor = zone === "promotion" ? colors.semantic.success : zone === "relegation" ? colors.semantic.error : "transparent";

  return (
    <View
      className={`flex-row items-stretch overflow-hidden rounded-2xl border ${
        isMine ? "border-brand-yellow/30 bg-brand-yellow/5" : "border-divider bg-surface"
      }`}
    >
      <View style={{ width: 4, backgroundColor: zoneColor }} />
      <View className="flex-1 flex-row items-center gap-3 p-3">
        <Text className="body-sm w-5 text-center font-body-semibold text-text-secondary">{rank}</Text>
        <StandingIcon isMine={isMine} myCrewIcon={myCrewIcon} rivalIcon={rivalIcon} rivalTint={rivalTint} />
        <EditableText
          id={`crew.league.${id}.name`}
          className={`body-sm flex-1 font-body-semibold ${isMine ? "text-brand-yellow" : "text-text-primary"}`}
          numberOfLines={1}
        >
          {isMine ? "Your Crew" : name}
        </EditableText>
        <EditableText id={`crew.league.${id}.power`} className="body-sm font-body-bold text-text-primary">
          {weeklyPower.toLocaleString("en-US")}
        </EditableText>
      </View>
    </View>
  );
}

function HistoryRow({ result }: { result: LeagueWeekResult }) {
  const meta = OUTCOME_META[result.outcome];
  const weekLabel = fromDateKey(result.weekKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      <Ionicons name={meta.icon} size={20} color={meta.color} />
      <View className="flex-1 gap-0.5">
        <Text className="body-sm font-body-semibold text-text-primary">Week of {weekLabel}</Text>
        <Text className="caption text-text-secondary">
          #{result.myRank} of {result.totalCrews} in {result.division}
        </Text>
      </View>
      <Text className="caption font-body-bold" style={{ color: meta.color }}>
        {meta.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function CrewLeagueTab() {
  const crewName = useCrewStore((state) => state.name);
  const crewIcon = useCrewStore((state) => state.icon);
  const crewDivision = useCrewStore((state) => state.division);
  const members = useCrewStore((state) => state.members);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const history = useCrewLeagueStore((state) => state.history);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);

  const weekKey = currentWeekKey();
  const { startKey, endKey } = weekKeyRange(weekKey);
  const myWeeklyPower = computeCrewWeeklyPower(members, workouts, membersActivity, startKey, endKey);
  const rivals = sameDivisionRivals(OTHER_CREWS_POWER, crewDivision);
  const standings = computeLeagueStandings(weekKey, crewName, myWeeklyPower, rivals);
  const outcome = determineLeagueOutcome(standings);
  const total = standings.length;
  const zoneSize = leagueZoneSize(total);

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <EditableText id="crew.league.headline" style={headerStyle} className="text-brand-white">
          WEEKLY LEAGUE
        </EditableText>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="shield" size={13} color={DIVISION_COLOR[crewDivision]} />
          <Text className="caption font-body-semibold text-text-secondary">
            Top {zoneSize} promote, bottom {zoneSize} drop — resets every Monday.
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)}
        className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="shield-outline" size={16} color={colors.neutral.textSecondary} />
          <Text className="body-sm font-body-semibold text-text-primary">{crewDivision} Division</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="time-outline" size={16} color={colors.semantic.streak} />
          <Text className="body-sm font-body-semibold text-text-secondary">{daysLeftInWeek()} days left</Text>
        </View>
      </Animated.View>

      {total < 3 ? (
        <Animated.View
          entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)}
          className="items-center gap-2 rounded-2xl border border-dashed border-divider px-6 py-10"
        >
          <Ionicons name="hourglass-outline" size={26} color={colors.neutral.textSecondary} />
          <Text className="body-sm text-center text-text-secondary">Not enough crews in {crewDivision} yet for a full bracket.</Text>
        </Animated.View>
      ) : (
        <View className="gap-2.5">
          {standings.map((standing, index) => {
            const rank = index + 1;
            const zone = rank <= zoneSize ? "promotion" : rank > total - zoneSize ? "relegation" : null;
            return (
              <Animated.View key={standing.id} entering={FadeInUp.delay(140 + index * 50).springify().damping(16).mass(0.6)}>
                <StandingRow
                  id={standing.id}
                  rank={rank}
                  name={standing.name}
                  myCrewIcon={crewIcon}
                  rivalIcon={standing.icon}
                  rivalTint={standing.tint}
                  weeklyPower={standing.weeklyPower}
                  isMine={standing.isMine}
                  zone={zone}
                />
              </Animated.View>
            );
          })}

          <Animated.View
            entering={FadeInUp.delay(140 + standings.length * 50).springify().damping(16).mass(0.6)}
            className="flex-row items-center gap-1.5 px-1 pt-1"
          >
            <Ionicons
              name={outcome === "promoted" ? "trending-up" : outcome === "relegated" ? "trending-down" : "remove"}
              size={13}
              color={OUTCOME_META[outcome].color}
            />
            <Text className="caption font-body-semibold" style={{ color: OUTCOME_META[outcome].color }}>
              {outcome === "promoted" && "In the promotion zone right now."}
              {outcome === "relegated" && "In the relegation zone right now."}
              {outcome === "held" && "Holding your division right now."}
            </Text>
          </Animated.View>
        </View>
      )}

      {history.length > 0 && (
        <View className="mt-2 gap-2.5">
          <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
            PAST WEEKS
          </Text>
          {history.map((result) => (
            <HistoryRow key={result.weekKey} result={result} />
          ))}
        </View>
      )}
    </View>
  );
}
