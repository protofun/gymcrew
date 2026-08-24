import { create } from "zustand";

/**
 * Drives "viewing at X kg" mode across the profile family of screens (Profile, Ranks, Rank Over
 * Time, Achievements, Training History, Body Log, All Stats) — set once from a tapped Body Log
 * entry, read anywhere via this same global store so the mode survives a tab switch without
 * threading params through every route. Deliberately not persisted: a fresh app launch always
 * starts live.
 */
type ProfileSnapshotState = {
  asOfMs: number | null;
  weightKg: number | null;
  setSnapshot: (asOfMs: number, weightKg: number) => void;
  clearSnapshot: () => void;
};

export const useProfileSnapshotStore = create<ProfileSnapshotState>((set) => ({
  asOfMs: null,
  weightKg: null,
  setSnapshot: (asOfMs, weightKg) => set({ asOfMs, weightKg }),
  clearSnapshot: () => set({ asOfMs: null, weightKg: null }),
}));
