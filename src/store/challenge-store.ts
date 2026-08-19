import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ChallengeMetric } from "@/data/challenges";

export type CustomChallenge = {
  id: string;
  opponentCrewName: string;
  name: string;
  description: string;
  metric: ChallengeMetric;
  unit: string;
  target: number;
  startedAt: number;
  endsAt: number;
};

type ChallengeState = {
  /** The current user's real, sanitized contribution so far, keyed by weekly instanceId or custom challenge id. */
  progress: Record<string, number>;
  /** Weekly challenge instanceIds already rewarded with crew XP, so a re-render can't grant it twice. */
  awardedIds: string[];
  customChallenges: CustomChallenge[];
  addProgress: (id: string, amount: number) => void;
  markAwarded: (id: string) => void;
  createCustomChallenge: (challenge: Omit<CustomChallenge, "id" | "startedAt">) => void;
};

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set) => ({
      progress: {},
      awardedIds: [],
      customChallenges: [],
      addProgress: (id, amount) =>
        set((state) => (amount <= 0 ? state : { progress: { ...state.progress, [id]: (state.progress[id] ?? 0) + amount } })),
      markAwarded: (id) => set((state) => (state.awardedIds.includes(id) ? state : { awardedIds: [...state.awardedIds, id] })),
      createCustomChallenge: (challenge) =>
        set((state) => ({
          customChallenges: [...state.customChallenges, { ...challenge, id: `custom-${Date.now()}`, startedAt: Date.now() }],
        })),
    }),
    {
      name: "gymcrew-challenges",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
