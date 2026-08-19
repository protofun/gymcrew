import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceDivision, type Division } from "@/lib/division";
import type { DivisionCelebration, DivisionHistoryEntry } from "@/store/crew-store";

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

const DEFAULT_STATE: ProfileLevelState = {
  xp: 0,
  division: "Rookie",
  divisionHistory: [{ division: "Rookie", reachedAt: Date.now() }],
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
    },
  ),
);
