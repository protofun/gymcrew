import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { CrewCard } from "@/components/CrewCard";
import { GoalsWidget } from "@/components/GoalsWidget";
import { LastWorkoutWidget } from "@/components/LastWorkoutWidget";
import { MuscleSuggestions } from "@/components/MuscleSuggestions";
import { VisualTrainingCalendar } from "@/components/VisualTrainingCalendar";
import { WelcomeWidget } from "@/components/WelcomeWidget";
import { deriveWorkoutSessions } from "@/lib/workout-sessions";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

export default function HomeScreen() {
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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <WelcomeWidget name={firstName} onPressStartWorkout={handleStartWorkout} />
      <View className="mx-4 mt-8">
        <VisualTrainingCalendar workouts={workouts} gender={gender} />
      </View>
      <MuscleSuggestions sessions={sessions} />
      <LastWorkoutWidget sessions={sessions} />
      <GoalsWidget sessions={sessions} />
      <CrewCard />
    </ScrollView>
  );
}
