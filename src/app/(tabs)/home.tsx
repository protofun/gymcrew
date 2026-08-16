import { ScrollView } from "react-native";

import { CrewCard } from "@/components/CrewCard";
import { GoalsWidget } from "@/components/GoalsWidget";
import { LastWorkoutWidget } from "@/components/LastWorkoutWidget";
import { MuscleSuggestions } from "@/components/MuscleSuggestions";
import { TrainingCalendar } from "@/components/TrainingCalendar";
import { WelcomeWidget } from "@/components/WelcomeWidget";
import { MOCK_WORKOUT_SESSIONS } from "@/data/workout-log";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function HomeScreen() {
  const fullName = useOnboardingStore((state) => state.onboarding.fullName);
  const firstName = fullName?.trim().split(" ")[0] || "Athlete";

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <WelcomeWidget name={firstName} onPressStartWorkout={() => {}} />
      <TrainingCalendar sessions={MOCK_WORKOUT_SESSIONS} />
      <MuscleSuggestions sessions={MOCK_WORKOUT_SESSIONS} />
      <LastWorkoutWidget sessions={MOCK_WORKOUT_SESSIONS} />
      <GoalsWidget sessions={MOCK_WORKOUT_SESSIONS} />
      <CrewCard />
    </ScrollView>
  );
}
