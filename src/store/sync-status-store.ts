import { create } from "zustand";

/**
 * Deliberately NOT persisted — whether this session has actually confirmed fresh data from the
 * database must be re-verified on every app load/sign-in, never assumed true just because it was
 * true last time. See (tabs)/_layout.tsx (sets this once every store's `syncFromServer` has
 * resolved) and (tabs)/home.tsx (blocks rendering real numbers until this is true), so the home
 * screen can never show stale/local-only data as if it were confirmed from the server.
 */
type SyncStatusStore = {
  hasSyncedOnce: boolean;
  markSyncedOnce: () => void;
};

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  hasSyncedOnce: false,
  markSyncedOnce: () => set({ hasSyncedOnce: true }),
}));
