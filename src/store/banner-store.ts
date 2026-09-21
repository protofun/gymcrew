import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured, type ApiBanner } from "@/lib/api";

const MAX_REMEMBERED_DISMISSALS = 200;

type BannerState = {
  /** Everything the server says this user should see right now (banners and popups). */
  banners: ApiBanner[];
  /** Banners/popups this person already closed — never shown to them again, even after a restart. */
  dismissedIds: number[];
};

type BannerActions = {
  fetch: () => Promise<void>;
  dismiss: (id: number) => void;
};

/** Ids already counted as a view this session — the admin panel's "views" is people-per-open, not
 * every re-render or tab switch. */
const viewedThisSession = new Set<number>();

export function trackBannerViewOnce(id: number): void {
  if (viewedThisSession.has(id) || !isApiConfigured) return;
  viewedThisSession.add(id);
  api.trackBannerView(id).catch(() => {});
}

export const useBannerStore = create<BannerState & BannerActions>()(
  persist(
    (set, get) => ({
      banners: [],
      dismissedIds: [],

      fetch: async () => {
        if (!isApiConfigured) return;
        try {
          set({ banners: await api.getBanners() });
        } catch (error) {
          console.warn("Failed to load banners", error);
        }
      },

      dismiss: (id) => {
        if (get().dismissedIds.includes(id)) return;
        set({ dismissedIds: [...get().dismissedIds, id].slice(-MAX_REMEMBERED_DISMISSALS) });
      },
    }),
    {
      name: "gymcrew-banners",
      storage: createJSONStorage(() => AsyncStorage),
      // Only the dismissals are worth keeping — the banner list itself is always re-fetched.
      partialize: (state) => ({ dismissedIds: state.dismissedIds }),
    },
  ),
);
