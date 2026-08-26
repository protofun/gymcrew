import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";
import { advanceDivision, divisionIndex, type Division } from "@/lib/division";
import type { DivisionCelebration, DivisionHistoryEntry } from "@/store/crew-store";
import { TOKENS_PER_DIVISION, useCurrencyStore } from "@/store/currency-store";

type ProfileLevelSyncedData = {
  xp: number;
  division: Division;
  /** Every division reached so far, oldest first — the current division is the last entry. */
  divisionHistory: DivisionHistoryEntry[];
};

type ProfileLevelState = ProfileLevelSyncedData & {
  /** Set the moment `addXp` pushes the user into a new division; cleared via `clearDivisionCelebration`.
   * Deliberately not synced to the backend — it's a one-shot "show the celebration" UI flag, not
   * real data. */
  pendingDivisionCelebration: DivisionCelebration | null;
};

type ProfileLevelActions = {
  /** Adds personal XP (e.g. finishing a workout, hitting a PR), rolling over into the next division if it fills the bar. */
  addXp: (amount: number) => void;
  clearDivisionCelebration: () => void;
  syncFromServer: () => Promise<void>;
};

const DEFAULT_STATE: ProfileLevelState = {
  xp: 0,
  division: "Rookie",
  divisionHistory: [{ division: "Rookie", reachedAt: Date.now() }],
  pendingDivisionCelebration: null,
};

function syncPush(get: () => ProfileLevelState) {
  if (!isApiConfigured) return;
  const { xp, division, divisionHistory } = get();
  api.updateProfileLevel({ xp, division, divisionHistory }).catch((error) => console.warn("Failed to sync profile level to server", error));
}

export const useProfileLevelStore = create<ProfileLevelState & ProfileLevelActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      addXp: (amount) => {
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
        });
        syncPush(get);
      },
      clearDivisionCelebration: () => set({ pendingDivisionCelebration: null }),
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const data = await api.getProfileLevel();
          if (data) set({ xp: data.xp, division: data.division as Division, divisionHistory: data.divisionHistory as DivisionHistoryEntry[] });
        } catch (error) {
          console.warn("Failed to sync profile level from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-profile-level",
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped once to hard-discard any locally cached demo/seed division+XP from before this app
      // stopped shipping a fake pre-earned rank by default — only real earned XP and whatever the
      // database actually has (via `syncFromServer`) count from here on.
      version: 1,
      migrate: () => DEFAULT_STATE,
    },
  ),
);
