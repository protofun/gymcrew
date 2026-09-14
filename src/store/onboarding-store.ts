import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";
import { pullState, pushState } from "@/lib/backend-sync";
import { markClerkAccountCrewSelected, markClerkAccountOnboarded } from "@/lib/clerk";
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
  creatineReminders: boolean;
  /** "HH:mm", 24h — when the daily creatine nudge should appear. Defaults to "09:00" at usage
   * sites (see notifications.tsx / lib/notifications.ts), same optional-with-fallback convention
   * as the other notification toggles above (none of these are seeded in the store's initial
   * state, only set once the user actually visits Notification Settings). */
  creatineReminderTime: string;
  /** "HH:mm", 24h — when the daily workout-reminder nudge should appear. Defaults to "18:00" at
   * usage sites, same convention as `creatineReminderTime` above. */
  workoutReminderTime: string;
};

/** The subset of OnboardingData that's also broken out into real columns on the backend `users`
 * table (see backend/routes/profile.php) — handy for anything that ever needs to query/browse
 * profiles directly (e.g. via phpMyAdmin). The *complete* onboarding answers (every field on
 * OnboardingData, not just this subset) are separately synced wholesale as one JSON blob — see
 * `setOnboardingData`/`syncProfileFromServer` below and backend/routes/state.php. */
const PROFILE_SYNC_KEYS = ["email", "fullName", "username", "gender", "heightCm", "weightKg", "age", "gymName", "goal", "experienceLevel"] as const;

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
  /** Pushes the real, verified email from the signed-in Clerk account straight to the backend — see
   * backend/routes/profile.php's maybeLinkFoundingAthlete, which needs users.email set before it can
   * link a Founding Athlete's marketing-site account (and Crew) to this real one. The onboarding
   * wizard no longer asks for an email at all (it only ever runs for someone already signed in, so
   * Clerk already has it, verified) — this is how it reaches the backend instead. Unlike
   * `setOnboardingData`'s fire-and-forget push, this is awaited: build-crew/_layout.tsx calls it
   * right before checking whether a Crew already exists, so that check never races the link. */
  syncEmailToBackend: (email: string) => Promise<void>;
  completeOnboarding: () => void;
  setCrewData: (data: Partial<CrewData>) => void;
  completeCrewSelection: () => void;
  /** Sends the user back through the crew choose/create/join flow — e.g. after leaving their crew. */
  resetCrewSelection: () => void;
  setWeightUnit: (unit: WeightUnit) => void;
  /** Pulls the real backend profile once a backend is configured and reachable — both the "core"
   * columns (fast, queryable) and the complete onboarding-answers blob — merging in only the
   * fields the backend actually has a value for, so a brand-new backend row (all nulls) never
   * blanks out onboarding data the wizard already collected locally. */
  syncProfileFromServer: () => Promise<void>;
  /** Re-pushes everything the wizard collected so far. The wizard runs entirely *before* sign-up —
   * every push during it (see `setOnboardingData`/`setCrewData` above) silently fails with "not
   * signed in" (no session exists yet) and gets swallowed by its own `.catch()`. Call this once,
   * right after sign-up actually completes and a session exists (see sign-up.tsx), so that
   * already-collected data doesn't just vanish into local storage. */
  pushAllOnboardingData: () => void;
  /** Wipes this store's in-memory state back to a brand-new install's defaults — called from
   * `resetLocalStateForAccountSwitch` (see lib/reset-local-state.ts) right after sign-out, on every
   * platform. Without this, `AsyncStorage.clear()` alone leaves this already-mounted store's
   * in-memory state (name/weight/gender/goals/crew choices) untouched; if a second account signs up
   * in the same app session before a full reload happens, `pushAllOnboardingData` would push the
   * FIRST account's answers onto the second one. Native has no cross-platform "reload the JS bundle"
   * primitive without adding a new dependency (e.g. expo-updates), so this resets the one store that
   * actually gets wholesale-pushed on sign-up, directly, instead. */
  resetForAccountSwitch: () => void;
};

type OnboardingBlob = { onboarding: Partial<OnboardingData>; crew: Partial<CrewData>; weightUnit: WeightUnit };

function pushOnboardingBlob(get: () => OnboardingStore) {
  const { onboarding, crew, weightUnit } = get();
  pushState("onboarding-full", { onboarding, crew, weightUnit });
}

// Just enough of a starter profile for rank calculations (e.g. the member profile's muscle rank
// heatmap) to work before onboarding — real onboarding overwrites this permanently. Shared by the
// store's initial state and `resetForAccountSwitch` so the two can never drift apart.
const INITIAL_ONBOARDING_STATE = {
  onboarding: { gender: "male" as const, weightKg: 85 },
  crew: {},
  hasCompletedOnboarding: false,
  hasCompletedCrewSelection: false,
  weightUnit: "kg" as const,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_ONBOARDING_STATE,
      setOnboardingData: (data) => {
        set((state) => ({ onboarding: { ...state.onboarding, ...data } }));
        pushOnboardingBlob(get);

        if (isApiConfigured) {
          const profileUpdate = pickDefined(data, PROFILE_SYNC_KEYS);
          if (Object.keys(profileUpdate).length > 0) {
            api.updateProfile(profileUpdate).catch((error) => console.warn("Failed to sync profile to server", error));
          }
        }
      },
      syncEmailToBackend: async (email) => {
        set((state) => ({ onboarding: { ...state.onboarding, email } }));
        pushOnboardingBlob(get);
        if (!isApiConfigured) return;
        try {
          await api.updateProfile({ email });
        } catch (error) {
          console.warn("Failed to sync email to server", error);
        }
      },
      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
        // No-op if nobody's signed in yet (e.g. mid-wizard, before account creation) — the
        // sign-up screen calls this again once a real account exists, which is what actually
        // persists it. See lib/clerk.ts.
        void markClerkAccountOnboarded();
      },
      setCrewData: (data) => {
        set((state) => ({ crew: { ...state.crew, ...data } }));
        pushOnboardingBlob(get);
      },
      completeCrewSelection: () => {
        set({ hasCompletedCrewSelection: true });
        void markClerkAccountCrewSelected();
      },
      resetCrewSelection: () => set({ hasCompletedCrewSelection: false }),
      setWeightUnit: (weightUnit) => {
        set({ weightUnit });
        pushOnboardingBlob(get);
      },
      syncProfileFromServer: async () => {
        if (!isApiConfigured) return;

        await pullState<OnboardingBlob>("onboarding-full", (data) => {
          set((state) => ({
            onboarding: { ...state.onboarding, ...data.onboarding },
            crew: { ...state.crew, ...data.crew },
            weightUnit: data.weightUnit ?? state.weightUnit,
          }));
        });

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
          // Whether this account has already onboarded (on some other device) is decided by Clerk's
          // `hasCompletedOnboarding` metadata flag alone (see lib/clerk.ts / hooks/use-clerk-flag-sync,
          // wired up in app/index.tsx and friends) — NOT inferred from field presence here. An earlier
          // version of this function auto-completed onboarding once gender/weightKg/heightCm were all
          // truthy, but gender and weightKg are seeded with non-null placeholder defaults from the
          // moment this store is created (see the initial state below), so that check was really just
          // "does heightCm exist yet" — true for anyone whose backend happens to carry a heightCm from
          // an earlier abandoned attempt, which silently skipped the rest of the wizard (including the
          // actual stats step) for a real returning user who'd never genuinely finished it.
        } catch (error) {
          console.warn("Failed to sync profile from server, keeping local data", error);
        }
      },
      pushAllOnboardingData: () => {
        pushOnboardingBlob(get);
        if (isApiConfigured) {
          const profileUpdate = pickDefined(get().onboarding, PROFILE_SYNC_KEYS);
          if (Object.keys(profileUpdate).length > 0) {
            api.updateProfile(profileUpdate).catch((error) => console.warn("Failed to sync profile to server", error));
          }
        }
      },
      resetForAccountSwitch: () => set(INITIAL_ONBOARDING_STATE),
    }),
    {
      name: "gymcrew-onboarding",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
