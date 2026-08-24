import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceDivision, divisionIndex, type Division } from "@/lib/division";
import { DEMO_PROFILE_LEVEL } from "@/lib/demo-seed";
import type { DivisionCelebration, DivisionHistoryEntry } from "@/store/crew-store";
import { TOKENS_PER_DIVISION, useCurrencyStore } from "@/store/currency-store";

type ProfileLevelState = {
  xp: number;
  division: Division;
  /** Every division reached so far, oldest first — the current division is the last entry. */
  divisionHistory: DivisionHistoryEntry[];
  /** Set the moment `addXp` pushes the user into a new division; cleared via `clearDivisionCelebration`. */
  pendingDivisionCelebration: DivisionCelebration | null;
};

type ProfileLevelActions = {
  /** Adds personal XP (e.g. finishing a workout, hitting a PR), rolling over into the next division if it fills the bar. */
  addXp: (amount: number) => void;
  clearDivisionCelebration: () => void;
};

// A brand new account starts already at the division/XP a year of consistent training (see
// lib/demo-seed.ts) would realistically earn, computed by replaying the exact same `advanceDivision`
// logic `addXp` below uses — so this isn't a made-up division, it's what the demo history actually adds up to.
const DEFAULT_STATE: ProfileLevelState = {
  xp: DEMO_PROFILE_LEVEL.xp,
  division: DEMO_PROFILE_LEVEL.division,
  divisionHistory: DEMO_PROFILE_LEVEL.divisionHistory,
  pendingDivisionCelebration: null,
};

export const useProfileLevelStore = create<ProfileLevelState & ProfileLevelActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      addXp: (amount) =>
        set((state) => {
          const result = advanceDivision(state.xp, state.division, amount);
          if (!result.leveledUp) return { xp: result.xp };

          const tiersGained = Math.max(1, divisionIndex(result.to) - divisionIndex(result.from));
          useCurrencyStore.getState().grantTokens(TOKENS_PER_DIVISION * tiersGained);

          return {
            xp: result.xp,
            division: result.division,
            divisionHistory: [...state.divisionHistory, { division: result.to, reachedAt: Date.now() }],
            pendingDivisionCelebration: { from: result.from, to: result.to },
          };
        }),
      clearDivisionCelebration: () => set({ pendingDivisionCelebration: null }),
    }),
    {
      name: "gymcrew-profile-level",
      storage: createJSONStorage(() => AsyncStorage),
      // Only backfill the demo division/XP for a genuinely untouched account (still at 0 XP) — any
      // real earned XP, even a little, always wins and is never overwritten.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<ProfileLevelState & ProfileLevelActions> | undefined) ?? {};
        if (persisted.xp && persisted.xp > 0) return { ...currentState, ...persisted };
        return currentState;
      },
    },
  ),
);
