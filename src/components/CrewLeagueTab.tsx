import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE, HOME_SECTION_TITLE } from "@/components/homeStyle";
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

/** The rank number doubles as the zone indicator — a colored ring for the promotion/relegation zones
 * instead of the boxed row's old left-edge color bar, the same "the leading circle carries the
 * meaning" idea `HomeRowLead` uses everywhere else. */
function RankBubble({ rank, zone }: { rank: number; zone: "promotion" | "relegation" | null }) {
  const color = zone === "promotion" ? colors.semantic.success : zone === "relegation" ? colors.semantic.error : colors.neutral.divider;
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: color }} className="items-center justify-center">
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: zone ? color : colors.neutral.textSecondary }}>{rank}</Text>
    </View>
  );
}

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
  isLast,
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
  isLast: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <RankBubble rank={rank} zone={zone} />
      <StandingIcon isMine={isMine} myCrewIcon={myCrewIcon} rivalIcon={rivalIcon} rivalTint={rivalTint} />
      <EditableText id={`crew.league.${id}.name`} style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18, color: isMine ? colors.brand.yellow : colors.brand.white }]} numberOfLines={1} className="flex-1">
        {isMine ? "Your Crew" : name}
      </EditableText>
      <EditableText id={`crew.league.${id}.power`} style={{ fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.brand.white }}>
        {weeklyPower.toLocaleString("en-US")}
      </EditableText>
    </View>
  );
}

function HistoryRow({ result, isLast }: { result: LeagueWeekResult; isLast: boolean }) {
  const meta = OUTCOME_META[result.outcome];
  const weekLabel = fromDateKey(result.weekKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-divider"}`}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral.surface }} className="items-center justify-center">
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text style={[HOME_ROW_TITLE, { fontSize: 15, lineHeight: 17 }]}>{`WEEK OF ${weekLabel.toUpperCase()}`}</Text>
        <Text style={HOME_ROW_DETAIL}>{`#${result.myRank} of ${result.totalCrews} · ${result.division}`}</Text>
      </View>
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 12, letterSpacing: 1, color: meta.color }}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

/** The Crew League tab — same flowing, no-boxed-cards system as the rest of Crew: `RankBubble`'s
 * ringed number carries the promotion/relegation zone instead of the old boxed row's left-edge color
 * bar, and the standings/history lists are hairline-divided rows, not stacked cards. */
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
    <View className="mx-4 mt-4 gap-5">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={HOME_SECTION_TITLE}>WEEKLY LEAGUE</Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="shield" size={13} color={DIVISION_COLOR[crewDivision]} />
          <Text className="caption font-body-semibold text-text-secondary">
            {`Top ${zoneSize} promote, bottom ${zoneSize} drop — resets every Monday.`}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)} className="flex-row items-center justify-between border-y border-divider py-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="shield-outline" size={16} color={colors.neutral.textSecondary} />
          <Text style={[HOME_ROW_TITLE, { fontSize: 15, lineHeight: 17 }]}>{`${crewDivision.toUpperCase()} DIVISION`}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="time-outline" size={16} color={colors.semantic.streak} />
          <Text style={HOME_ROW_DETAIL}>{`${daysLeftInWeek()} days left`}</Text>
        </View>
      </Animated.View>

      {total < 3 ? (
        <Animated.View entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)} className="items-center gap-2 py-10">
          <Ionicons name="hourglass-outline" size={26} color={colors.neutral.textSecondary} />
          <Text style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>{`Not enough crews in ${crewDivision} yet for a full bracket.`}</Text>
        </Animated.View>
      ) : (
        <View>
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
                  isLast={index === standings.length - 1}
                />
              </Animated.View>
            );
          })}

          <Animated.View entering={FadeInUp.delay(140 + standings.length * 50).springify().damping(16).mass(0.6)} className="mt-3 flex-row items-center gap-1.5">
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
        <View className="gap-2 border-t border-divider pt-4">
          <Text style={HOME_EYEBROW}>PAST WEEKS</Text>
          <View>
            {history.map((result, index) => (
              <HistoryRow key={result.weekKey} result={result} isLast={index === history.length - 1} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
