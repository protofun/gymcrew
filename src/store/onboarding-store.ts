import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";
import type { Weekday } from "@/data/weekdays";
import type { WeightUnit } from "@/store/active-workout-store";

export type Gender = "male" | "female";
export type CrewChoice = "join" | "create" | "later";

type OnboardingData = {
  fullName: string;
  username: string;
  email: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  /** Free-text home gym — no gym directory yet, just a label shown around the app (e.g. Ranks'
   * "My Gym" scope). */
  gymName: string;
  goal: string;
  experienceLevel: string;
  benchPress1RM: number;
  squat1RM: number;
  deadlift1RM: number;
  bodyFatPercent: number;
  trainingSplit: string;
  workoutsPerWeek: number;
  workoutDuration: string;
  restTimerEnabled: boolean;
  /** Weekday → workout name (e.g. "Push Day", or a custom name when trainingSplit is "Other / Custom"). Missing day = rest day. */
  weeklySchedule: Partial<Record<Weekday, string>>;
  workoutReminders: boolean;
  crewChallengeAlerts: boolean;
  progressUpdates: boolean;
  marketingTips: boolean;
};

/** The subset of OnboardingData that also lives in the backend `users` table (see
 * backend/routes/profile.php) — everything else (crew choice, notification toggles, the weekly
 * schedule, ...) stays device-local for now. */
const PROFILE_SYNC_KEYS = ["fullName", "gender", "heightCm", "weightKg", "age", "gymName", "goal", "experienceLevel"] as const;

function pickDefined<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

type CrewData = {
  choice: CrewChoice;
  crewName: string;
  trainingType: string;
  icon: string;
  visibility: string;
  whoCanJoin: string;
  maxMembers: string;
  allowChallenges: boolean;
  allowInvitations: boolean;
};

type OnboardingStore = {
  onboarding: Partial<OnboardingData>;
  crew: Partial<CrewData>;
  hasCompletedOnboarding: boolean;
  hasCompletedCrewSelection: boolean;
  /** A standalone app preference, not part of the onboarding wizard's own data — kept here since
   * this store already persists globally and every screen already reads profile info from it. */
  weightUnit: WeightUnit;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  setCrewData: (data: Partial<CrewData>) => void;
  completeCrewSelection: () => void;
  /** Sends the user back through the crew choose/create/join flow — e.g. after leaving their crew. */
  resetCrewSelection: () => void;
  setWeightUnit: (unit: WeightUnit) => void;
  /** Pulls the real backend profile once a backend is configured and reachable, merging in only
   * the fields the backend actually has a value for — a brand-new backend row (all nulls) never
   * blanks out onboarding data the wizard already collected locally. */
  syncProfileFromServer: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Just enough of a starter profile for rank calculations (e.g. the member profile's muscle
      // rank heatmap) to work before onboarding — real onboarding overwrites this permanently.
      onboarding: { gender: "male", weightKg: 85 },
      crew: {},
      hasCompletedOnboarding: false,
      hasCompletedCrewSelection: false,
      weightUnit: "kg",
      setOnboardingData: (data) => {
        set((state) => ({ onboarding: { ...state.onboarding, ...data } }));

        if (isApiConfigured) {
          const profileUpdate = pickDefined(data, PROFILE_SYNC_KEYS);
          if (Object.keys(profileUpdate).length > 0) {
            api.updateProfile(profileUpdate).catch((error) => console.warn("Failed to sync profile to server", error));
          }
        }
      },
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setCrewData: (data) => set((state) => ({ crew: { ...state.crew, ...data } })),
      completeCrewSelection: () => set({ hasCompletedCrewSelection: true }),
      resetCrewSelection: () => set({ hasCompletedCrewSelection: false }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      syncProfileFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const profile = await api.getProfile();
          const update: Partial<OnboardingData> = {};
          for (const key of PROFILE_SYNC_KEYS) {
            const value = profile[key];
            if (value !== null && value !== undefined) (update as Record<string, unknown>)[key] = value;
          }
          if (Object.keys(update).length > 0) {
            set((state) => ({ onboarding: { ...state.onboarding, ...update } }));
          }

          // A backend profile with the core wizard fields already filled in means this account has
          // onboarded before, on some device — skip the wizard here too instead of sending a
          // returning user through it again just because this device's local storage is fresh.
          // Centralized here (not just in the sign-in button handler) so it also covers a session
          // that's already active when the app loads with no local "completed" flag set yet.
          const merged = get().onboarding;
          if (merged.gender && merged.weightKg && merged.heightCm) {
            set({ hasCompletedOnboarding: true });
          }
        } catch (error) {
          console.warn("Failed to sync profile from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-onboarding",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
