import { create } from "zustand";

import { api, isApiConfigured, type ApiAppConfig } from "@/lib/api";

type AppConfigState = {
  /** null until the first successful fetch — and it stays null if the server can't be reached, so a
   * network problem never locks anyone out (see AppGate). */
  config: ApiAppConfig | null;
  fetch: () => Promise<void>;
};

export const useAppConfigStore = create<AppConfigState>()((set) => ({
  config: null,

  fetch: async () => {
    if (!isApiConfigured) return;
    try {
      set({ config: await api.getAppConfig() });
    } catch (error) {
      console.warn("Failed to load the app config", error);
    }
  },
}));
