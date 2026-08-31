import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The only account allowed to see/use Developer Mode (see profile/account.tsx). */
export const DEVELOPER_MODE_USER_ID = "user_3HriM4eE0Ir7FlM4RCWohr7VV2o";

type DeveloperModeStore = {
  enabled: boolean;
  /** Keyed by the `id` passed to <EditableText> — plain string overrides only, purely local (never
   * pushed to the backend, see lib/backend-sync.ts). This is fake content for screenshots/videos,
   * not real app data. Numeric displays are covered too — <EditableText> just deals in strings, so
   * callers format the number first (see (tabs)/ranks.tsx's powerScore for the pattern). */
  overrides: Record<string, string>;
  toggleEnabled: () => void;
  setOverride: (id: string, value: string) => void;
  clearOverride: (id: string) => void;
  clearAllOverrides: () => void;
};

export const useDeveloperModeStore = create<DeveloperModeStore>()(
  persist(
    (set) => ({
      enabled: false,
      overrides: {},
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      setOverride: (id, value) => set((state) => ({ overrides: { ...state.overrides, [id]: value } })),
      clearOverride: (id) =>
        set((state) => {
          const rest = { ...state.overrides };
          delete rest[id];
          return { overrides: rest };
        }),
      clearAllOverrides: () => set({ overrides: {} }),
    }),
    {
      name: "gymcrew-developer-mode",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
