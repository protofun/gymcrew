import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { ChallengeMetric } from "@/data/challenges";

export type CustomChallenge = {
  id: string;
  opponentCrewName: string;
  /** The rival crew's static leaderboard power at the moment the battle was created — seeds their simulated pace (see lib/challenge-progress.ts). */
  opponentCrewPower: number;
  name: string;
  description: string;
  metric: ChallengeMetric;
  unit: string;
  target: number;
  startedAt: number;
  endsAt: number;
};

type ChallengeSyncedState = {
  /** The current user's real, sanitized contribution so far, keyed by weekly instanceId or custom challenge id. */
  progress: Record<string, number>;
  /** Weekly challenge instanceIds already rewarded with crew XP, so a re-render can't grant it twice. */
  awardedIds: string[];
  /** Custom (crew battle) challenge ids already rewarded for a WIN, so a re-render can't grant it twice. */
  battleWinAwardedIds: string[];
  customChallenges: CustomChallenge[];
};

type ChallengeState = ChallengeSyncedState & {
  addProgress: (id: string, amount: number) => void;
  markAwarded: (id: string) => void;
  markBattleWinAwarded: (id: string) => void;
  createCustomChallenge: (challenge: Omit<CustomChallenge, "id" | "startedAt">) => void;
  syncFromServer: () => Promise<void>;
};

function syncPush(get: () => ChallengeState) {
  const { progress, awardedIds, battleWinAwardedIds, customChallenges } = get();
  pushState("challenges", { progress, awardedIds, battleWinAwardedIds, customChallenges });
}

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set, get) => ({
      progress: {},
      awardedIds: [],
      battleWinAwardedIds: [],
      customChallenges: [],
      addProgress: (id, amount) => {
        set((state) => (amount <= 0 ? state : { progress: { ...state.progress, [id]: (state.progress[id] ?? 0) + amount } }));
        syncPush(get);
      },
      markAwarded: (id) => {
        set((state) => (state.awardedIds.includes(id) ? state : { awardedIds: [...state.awardedIds, id] }));
        syncPush(get);
      },
      markBattleWinAwarded: (id) => {
        set((state) => (state.battleWinAwardedIds.includes(id) ? state : { battleWinAwardedIds: [...state.battleWinAwardedIds, id] }));
        syncPush(get);
      },
      createCustomChallenge: (challenge) => {
        set((state) => ({
          customChallenges: [...state.customChallenges, { ...challenge, id: `custom-${Date.now()}`, startedAt: Date.now() }],
        }));
        syncPush(get);
      },
      syncFromServer: () => pullState<ChallengeSyncedState>("challenges", (data) => set(data)),
    }),
    {
      name: "gymcrew-challenges",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
