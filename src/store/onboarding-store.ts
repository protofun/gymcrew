import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  workoutReminders: boolean;
  crewChallengeAlerts: boolean;
  progressUpdates: boolean;
  marketingTips: boolean;
};

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
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  setCrewData: (data: Partial<CrewData>) => void;
  completeCrewSelection: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      onboarding: {},
      crew: {},
      hasCompletedOnboarding: false,
      hasCompletedCrewSelection: false,
      setOnboardingData: (data) =>
        set((state) => ({ onboarding: { ...state.onboarding, ...data } })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setCrewData: (data) => set((state) => ({ crew: { ...state.crew, ...data } })),
      completeCrewSelection: () => set({ hasCompletedCrewSelection: true }),
    }),
    {
      name: "gymcrew-onboarding",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
