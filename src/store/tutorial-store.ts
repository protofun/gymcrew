import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type TutorialStore = {
  /** Whether this device has ever finished (or skipped) the app tour — persisted, so it only
   * auto-starts once. Replaying it from the admin's "Open Tutorial Wizard" button doesn't touch
   * this flag on its own; finishing/skipping that replay does (see AppTourOverlay.tsx's onStop). */
  hasSeenTutorial: boolean;
  markTutorialSeen: () => void;
};

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set) => ({
      hasSeenTutorial: false,
      markTutorialSeen: () => set({ hasSeenTutorial: true }),
    }),
    {
      name: "gymcrew-tutorial",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
