import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { BiggestOpportunityCard } from "@/components/BiggestOpportunityCard";
import { CrewCard } from "@/components/CrewCard";
import { CrewWarWidget } from "@/components/CrewWarWidget";
import { GoalsWidget } from "@/components/GoalsWidget";
import { LastWorkoutWidget } from "@/components/LastWorkoutWidget";
import { MuscleSuggestions } from "@/components/MuscleSuggestions";
import { VisualTrainingCalendar } from "@/components/VisualTrainingCalendar";
import { WelcomeWidget } from "@/components/WelcomeWidget";
import { deriveWorkoutSessions } from "@/lib/workout-sessions";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSyncStatusStore } from "@/store/sync-status-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function HomeScreen() {
  const hasSyncedOnce = useSyncStatusStore((state) => state.hasSyncedOnce);
  const fullName = useOnboardingStore((state) => state.onboarding.fullName);
  const firstName = fullName?.trim().split(" ")[0] || "Athlete";
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const bodyWeightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const sessions = useMemo(() => deriveWorkoutSessions(workouts, bodyWeightKg), [workouts, bodyWeightKg]);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const posthog = usePostHog();

  function handleStartWorkout() {
    startWorkout();
    posthog.capture("workout_started", { source: "home" });
    router.push("/workout/active");
  }

  // Blocks on the real database pull (see (tabs)/_layout.tsx and sync-status-store.ts) rather than
  // ever showing whatever happens to be sitting in local storage as if it were confirmed — a stale
  // or wrong-account local cache must never flash on screen even for a moment.
  if (!hasSyncedOnce) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.brand.yellow} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <WelcomeWidget name={firstName} onPressStartWorkout={handleStartWorkout} />
      <CrewWarWidget />
      <View className="mx-4 mt-8">
        <VisualTrainingCalendar workouts={workouts} gender={gender} />
      </View>
      <MuscleSuggestions sessions={sessions} />
      <BiggestOpportunityCard />
      <LastWorkoutWidget sessions={sessions} />
      <GoalsWidget sessions={sessions} />
      <CrewCard />
    </ScrollView>
  );
}
