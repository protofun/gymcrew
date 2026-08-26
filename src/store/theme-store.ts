import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import { useCurrencyStore } from "@/store/currency-store";

type ThemeData = {
  /** Selected Workout Split accent theme key — see data/split-themes.ts. */
  splitThemeKey: string;
  /** Theme keys bought early with tokens (Store), on top of whichever division unlocks naturally cover. */
  purchasedThemeKeys: string[];
};

type ThemeState = ThemeData;

type ThemeActions = {
  setSplitTheme: (key: string) => void;
  /** Spends `cost` tokens to unlock `key` immediately. Returns false if already owned or tokens are short. */
  purchaseTheme: (key: string, cost: number) => boolean;
  syncFromServer: () => Promise<void>;
};

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      splitThemeKey: "yellow",
      purchasedThemeKeys: [],
      setSplitTheme: (key) => {
        set({ splitThemeKey: key });
        pushState("theme", { splitThemeKey: key, purchasedThemeKeys: get().purchasedThemeKeys });
      },
      purchaseTheme: (key, cost) => {
        const state = get();
        if (state.purchasedThemeKeys.includes(key)) return false;
        if (!useCurrencyStore.getState().spendTokens(cost)) return false;
        const purchasedThemeKeys = [...state.purchasedThemeKeys, key];
        set({ purchasedThemeKeys });
        pushState("theme", { splitThemeKey: get().splitThemeKey, purchasedThemeKeys });
        return true;
      },
      syncFromServer: () => pullState<ThemeData>("theme", (data) => set(data)),
    }),
    {
      name: "gymcrew-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
