import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The only accounts allowed to see/use Developer Mode (see profile/account.tsx), matched against
 * the signed-in Clerk account's email — same list as ADMIN_CHALLENGE_EMAILS there, kept separate
 * since the two gate different things and could diverge later. Lowercase: compared against an
 * already-lowercased email. */
export const DEVELOPER_MODE_EMAILS = ["jaimy.mathon@gmail.com", "akb.koycu@gmail.com"];

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
