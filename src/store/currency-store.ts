import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Spendable tokens — the earnable-currency leveling reward. Earned from every XP-earning activity,
 * not just division level-ups: finishing a workout, hitting a PR, completing a crew challenge, or
 * winning a crew Battle (see workout/active.tsx and ChallengesTab.tsx for the other grant sites).
 */
export const TOKENS_PER_DIVISION = 3;
export const TOKENS_PER_WORKOUT = 2;
export const TOKENS_PER_PR = 3;
export const TOKENS_PER_CHALLENGE_COMPLETE = 3;
export const TOKENS_PER_BATTLE_WIN = 5;
export const STREAK_FREEZE_COST = 5;
export const XP_BOOST_COST = 15;

type CurrencyState = {
  tokens: number;
  /** Date-keys a Streak Freeze was spent on — treated as a trained day for streak purposes (see lib/streak.ts). */
  freezeDateKeys: string[];
  /** True once a 2x XP Boost is bought, until the next workout consumes it (see workout/active.tsx). */
  xpBoostActive: boolean;
};

type CurrencyActions = {
  grantTokens: (amount: number) => void;
  /** Deducts `amount` tokens if there's enough balance. Returns false (spends nothing) otherwise — the generic spend path other stores (e.g. cosmetics-store) build purchases on top of. */
  spendTokens: (amount: number) => boolean;
  /** Spends a Streak Freeze to protect `dateKey`. Returns false (and spends nothing) if tokens are short or the day is already frozen. */
  useStreakFreeze: (dateKey: string) => boolean;
  /** Buys a 2x XP Boost for the next completed workout. Returns false if already active or tokens are short. */
  activateXpBoost: () => boolean;
  /** Called once the boosted workout's XP has been granted, so it doesn't double the next one too. */
  consumeXpBoost: () => void;
};

export const useCurrencyStore = create<CurrencyState & CurrencyActions>()(
  persist(
    (set, get) => ({
      tokens: 0,
      freezeDateKeys: [],
      xpBoostActive: false,
      grantTokens: (amount) => set((state) => ({ tokens: state.tokens + amount })),
      spendTokens: (amount) => {
        const state = get();
        if (state.tokens < amount) return false;
        set({ tokens: state.tokens - amount });
        return true;
      },
      useStreakFreeze: (dateKey) => {
        const state = get();
        if (state.tokens < STREAK_FREEZE_COST || state.freezeDateKeys.includes(dateKey)) return false;
        set({ tokens: state.tokens - STREAK_FREEZE_COST, freezeDateKeys: [...state.freezeDateKeys, dateKey] });
        return true;
      },
      activateXpBoost: () => {
        const state = get();
        if (state.xpBoostActive || state.tokens < XP_BOOST_COST) return false;
        set({ tokens: state.tokens - XP_BOOST_COST, xpBoostActive: true });
        return true;
      },
      consumeXpBoost: () => set({ xpBoostActive: false }),
    }),
    {
      name: "gymcrew-currency",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
