import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import {
  computeLeagueStandings,
  determineLeagueOutcome,
  weekKeyRange,
  type LeagueOutcome,
  type LeagueStanding,
  type RivalCrewInput,
} from "@/lib/crew-league";
import { currentWeekKey, toDateKey } from "@/lib/date";
import { DIVISIONS, divisionIndex, nextDivision, type Division } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";

/** How much of a week's league power becomes lasting crew power — a small fraction (weekly power runs
 * roughly 10-15x crewPower's own scale), so an active crew's power climbs steadily over months rather
 * than doubling in a week. */
const CREW_POWER_WEEKLY_GROWTH_RATIO = 0.005;

export type LeagueWeekResult = {
  weekKey: string;
  division: Division;
  standings: LeagueStanding[];
  myRank: number;
  totalCrews: number;
  outcome: LeagueOutcome;
};

type CrewLeagueState = {
  /** The week currently being tracked — once the real calendar week moves past this, `syncWeek` finalizes it. */
  weekKey: string;
  /** Finalized past weeks, newest first. */
  history: LeagueWeekResult[];
  /** Week keys whose shareable end-of-week recap card has already been shown and dismissed —
   * persisted so it doesn't pop up again on every later visit, only once per finalized week. */
  seenRecapWeekKeys: string[];
};

type SyncWeekInput = {
  myCrewName: string;
  myCrewPower: number;
  rivalCrews: RivalCrewInput[];
  /** Real crew weekly power for an arbitrary (possibly past) date-key range. */
  computeWeeklyPower: (startKey: string, endKey: string) => number;
};

type CrewLeagueActions = {
  /** Call on load with fresh inputs. No-ops unless the real current week has moved past the tracked
   * week, in which case it finalizes that week from real historical data, applies promotion/relegation
   * to the crew's division, and refreshes `crewPower`/`divisionTopPercentile` on crew-store. */
  syncWeek: (input: SyncWeekInput) => void;
  syncFromServer: () => Promise<void>;
  markRecapSeen: (weekKey: string) => void;
};

export const useCrewLeagueStore = create<CrewLeagueState & CrewLeagueActions>()(
  persist(
    (set, get) => ({
      weekKey: currentWeekKey(),
      history: [],
      seenRecapWeekKeys: [],
      syncWeek: ({ myCrewName, myCrewPower, rivalCrews, computeWeeklyPower }) => {
        const state = get();
        const nowWeekKey = currentWeekKey();

        // First-ever run for a crew (no finalized week yet) — the branch below only updates
        // `crewPower` once the real calendar week rolls all the way over, which left every new crew
        // reading a hard 0 for up to 7 days with nothing else ever seeding it (confirmed: `crewPower`
        // has no source anywhere but this file and `DEFAULT_CREW`'s own `0`). Seed it here instead,
        // from the CURRENT week's real progress-to-date. `CREW_POWER_WEEKLY_GROWTH_RATIO` (0.005) is
        // the INCREMENT added to an already-seeded `crewPower` each week, not the base scale — this
        // file's own doc comment on that constant says the real relationship is "weekly power runs
        // roughly 10-15x crewPower's own scale", so the seed divides by that instead (using the
        // midpoint, ~12.5) to land at a realistic starting number comparable to `OTHER_CREWS_POWER`'s
        // own seeded rival values (20k-32k for an established crew), not two orders of magnitude off.
        if (state.weekKey === nowWeekKey && state.history.length === 0 && myCrewPower === 0) {
          const { startKey } = weekKeyRange(nowWeekKey);
          const weeklyPowerSoFar = computeWeeklyPower(startKey, toDateKey(new Date()));
          if (weeklyPowerSoFar > 0) {
            useCrewStore.setState({ crewPower: Math.max(1, Math.round(weeklyPowerSoFar / 12.5)) });
          }
          return;
        }

        if (state.weekKey === nowWeekKey) return;

        const crew = useCrewStore.getState();
        const { startKey, endKey } = weekKeyRange(state.weekKey);
        const myWeeklyPower = computeWeeklyPower(startKey, endKey);
        const standings = computeLeagueStandings(state.weekKey, myCrewName, myWeeklyPower, rivalCrews);
        const outcome = determineLeagueOutcome(standings);
        const myRank = standings.findIndex((standing) => standing.isMine) + 1;

        const result: LeagueWeekResult = {
          weekKey: state.weekKey,
          division: crew.division,
          standings,
          myRank,
          totalCrews: standings.length,
          outcome,
        };

        const previousWeeklyPower = state.history[0]?.standings.find((standing) => standing.isMine)?.weeklyPower;
        const changePercent =
          previousWeeklyPower && previousWeeklyPower > 0
            ? Math.round(((myWeeklyPower - previousWeeklyPower) / previousWeeklyPower) * 1000) / 10
            : crew.crewPowerChangePercent;
        const newCrewPower = Math.max(0, Math.round(myCrewPower + myWeeklyPower * CREW_POWER_WEEKLY_GROWTH_RATIO));
        const topPercentile = Math.max(5, Math.min(100, Math.round((myRank / standings.length) * 100 / 5) * 5));

        let divisionUpdate: { division: Division; divisionHistory?: typeof crew.divisionHistory } = { division: crew.division };
        if (outcome === "promoted") {
          const next = nextDivision(crew.division);
          if (next) divisionUpdate = { division: next, divisionHistory: [...crew.divisionHistory, { division: next, reachedAt: Date.now() }] };
        } else if (outcome === "relegated") {
          const previousIndex = divisionIndex(crew.division) - 1;
          if (previousIndex >= 0) divisionUpdate = { division: DIVISIONS[previousIndex] };
        }

        useCrewStore.setState({
          crewPower: newCrewPower,
          crewPowerChangePercent: changePercent,
          divisionTopPercentile: topPercentile,
          ...divisionUpdate,
        });

        const next = { weekKey: nowWeekKey, history: [result, ...state.history].slice(0, 12) };
        set(next);
        pushState("crew-league", next);
      },
      syncFromServer: () => pullState<CrewLeagueState>("crew-league", (data) => set(data)),
      markRecapSeen: (weekKey) => set((state) => ({ seenRecapWeekKeys: [...state.seenRecapWeekKeys, weekKey] })),
    }),
    {
      name: "gymcrew-crew-league",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
