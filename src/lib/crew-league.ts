import { crewChallengeProgress, weekKeyRange, type MemberActivity } from "@/lib/challenge-progress";
import { toDateKey } from "@/lib/date";
import { divisionForCrewPower, type Division } from "@/lib/division";
import type { CrewMember } from "@/store/crew-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

export { weekKeyRange };

/** A rival crew's weekly power is a multiple of their static leaderboard power — calibrated so it
 * lands in the same ballpark as a real crew's actual weekly volume (mock member sessions run ~4
 * sessions/week at ~8,000-14,900 kg each, so a full crew's real weekly total is roughly an order of
 * magnitude above its static "power" score, not a fraction of it). */
const RIVAL_WEEKLY_POWER_RATIO = 12;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** A rival crew has no real weekly history, so its power for a given week is derived deterministically
 * from its name + the week key — stable if you reload, but genuinely different week to week, so the
 * league doesn't feel static. */
export function weeklyRivalPower(crewName: string, basePower: number, weekKey: string): number {
  const hash = hashString(`${crewName}:${weekKey}`);
  const variance = 0.7 + (hash % 60) / 100; // 0.70x–1.29x
  return Math.round(basePower * RIVAL_WEEKLY_POWER_RATIO * variance);
}

/** The current user's crew's real weekly power: their own logged volume this week, plus every real
 * member's actual volume for the same week — the same aggregation weekly challenges already use. */
export function computeCrewWeeklyPower(
  members: CrewMember[],
  myWorkouts: CompletedWorkout[],
  othersActivity: Record<string, MemberActivity>,
  startKey: string,
  endKey: string,
): number {
  const myVolume = myWorkouts
    .filter((workout) => {
      const key = toDateKey(new Date(workout.completedAt));
      return key >= startKey && key <= endKey;
    })
    .reduce((sum, workout) => sum + workout.volumeKg, 0);

  return Math.round(
    crewChallengeProgress(
      { type: "totalVolume" },
      members,
      myVolume,
      startKey,
      endKey,
      (memberId) => othersActivity[memberId] ?? { recentWorkouts: [], records: {} },
    ),
  );
}

export type LeagueStanding = {
  id: string;
  name: string;
  weeklyPower: number;
  isMine: boolean;
  icon?: string;
  tint?: string;
};

export type RivalCrewInput = { name: string; power: number; icon: string; tint: string };

/** This week's ranking: the user's crew plus every rival crew in the same division, sorted by weekly power. */
export function computeLeagueStandings(
  weekKey: string,
  myCrewName: string,
  myWeeklyPower: number,
  rivalCrews: RivalCrewInput[],
): LeagueStanding[] {
  const rivals: LeagueStanding[] = rivalCrews.map((crew) => ({
    id: crew.name,
    name: crew.name,
    weeklyPower: weeklyRivalPower(crew.name, crew.power, weekKey),
    isMine: false,
    icon: crew.icon,
    tint: crew.tint,
  }));

  const mine: LeagueStanding = { id: "me-crew", name: myCrewName, weeklyPower: myWeeklyPower, isMine: true };

  return [...rivals, mine].sort((a, b) => b.weeklyPower - a.weeklyPower);
}

/**
 * Rival crews in the same division as the user's crew — the same pool the leaderboard's Crews tab
 * uses. Takes the crew's real, authoritative division (promoted/relegated by the league) rather than
 * re-deriving it from `crewPower` — that field only grows slowly over time and would drift out of
 * sync with the division the league has actually placed the crew in.
 */
export function sameDivisionRivals(rivalCrews: RivalCrewInput[], myDivision: Division): RivalCrewInput[] {
  return rivalCrews.filter((crew) => divisionForCrewPower(crew.power) === myDivision);
}

export type LeagueOutcome = "promoted" | "relegated" | "held";

/** Top ~30% promote, bottom ~30% relegate — Duolingo-league style, scaling with bracket size instead
 * of a fixed headcount. Too few rivals in a division to form a bracket at all just holds. */
export const LEAGUE_ZONE_RATIO = 0.3;

export function leagueZoneSize(total: number): number {
  return Math.max(1, Math.floor(total * LEAGUE_ZONE_RATIO));
}

export function determineLeagueOutcome(standings: LeagueStanding[]): LeagueOutcome {
  const total = standings.length;
  if (total < 3) return "held";

  const myRank = standings.findIndex((standing) => standing.isMine) + 1;
  const zoneSize = leagueZoneSize(total);

  if (myRank <= zoneSize) return "promoted";
  if (myRank > total - zoneSize) return "relegated";
  return "held";
}
