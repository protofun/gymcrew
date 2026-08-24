import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { useCurrencyStore } from "@/store/currency-store";

type ThemeState = {
  /** Selected Workout Split accent theme key — see data/split-themes.ts. */
  splitThemeKey: string;
  /** Theme keys bought early with tokens (Store), on top of whichever division unlocks naturally cover. */
  purchasedThemeKeys: string[];
};

type ThemeActions = {
  setSplitTheme: (key: string) => void;
  /** Spends `cost` tokens to unlock `key` immediately. Returns false if already owned or tokens are short. */
  purchaseTheme: (key: string, cost: number) => boolean;
};

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      splitThemeKey: "yellow",
      purchasedThemeKeys: [],
      setSplitTheme: (key) => set({ splitThemeKey: key }),
      purchaseTheme: (key, cost) => {
        const state = get();
        if (state.purchasedThemeKeys.includes(key)) return false;
        if (!useCurrencyStore.getState().spendTokens(cost)) return false;
        set({ purchasedThemeKeys: [...state.purchasedThemeKeys, key] });
        return true;
      },
    }),
    {
      name: "gymcrew-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
