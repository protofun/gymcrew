import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { FLEX_TAGS } from "@/data/flex-tags";
import { useCurrencyStore } from "@/store/currency-store";

type CosmeticsState = {
  ownedTagIds: string[];
  equippedTagId: string | null;
};

type CosmeticsActions = {
  /** Buys a Flex Tag with tokens (see currency-store) and equips it if nothing else is equipped yet. Returns false if already owned or tokens are short. */
  purchaseTag: (id: string) => boolean;
  equipTag: (id: string | null) => void;
};

export const useCosmeticsStore = create<CosmeticsState & CosmeticsActions>()(
  persist(
    (set, get) => ({
      ownedTagIds: [],
      equippedTagId: null,
      purchaseTag: (id) => {
        const state = get();
        if (state.ownedTagIds.includes(id)) return false;
        const tag = FLEX_TAGS.find((candidate) => candidate.id === id);
        if (!tag) return false;
        if (!useCurrencyStore.getState().spendTokens(tag.cost)) return false;
        set({ ownedTagIds: [...state.ownedTagIds, id], equippedTagId: state.equippedTagId ?? id });
        return true;
      },
      equipTag: (id) => set({ equippedTagId: id }),
    }),
    {
      name: "gymcrew-cosmetics",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
