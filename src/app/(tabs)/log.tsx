import { router } from "expo-router";
import { Image, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { WorkoutStartCard } from "@/components/WorkoutStartCard";
import { WorkoutWeekStrip } from "@/components/WorkoutWeekStrip";
import { images } from "@/constants/images";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

export default function LogScreen() {
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const posthog = usePostHog();

  function handleStartWorkout() {
    startWorkout();
    posthog.capture("workout_started", { source: "quick_start" });
    router.push("/workout/active");
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-6" showsVerticalScrollIndicator={false}>
      <View className="items-center gap-8 pb-8 pt-6">
        <Image source={images.mascotArmsCrossed} resizeMode="contain" style={{ width: 220, height: 220 }} />

        <Text className="heading-3 text-center text-text-primary">WHAT DO YOU WANT TO DO?</Text>

        <View className="w-full gap-3">
          <WorkoutStartCard
            variant="primary"
            icon="flash"
            title="Start Workout Now"
            description="Jump into today's workout"
            onPress={handleStartWorkout}
          />
          <WorkoutStartCard
            icon="construct-outline"
            title="Build Workout"
            description="Create your own workout"
            onPress={() => router.push("/workout/build")}
          />
          <WorkoutStartCard
            icon="clipboard-outline"
            title="Choose from Templates"
            description="Use a proven workout plan"
            onPress={() => router.push("/workout/templates")}
          />
        </View>
      </View>

      {workouts.length > 0 && (
        <WorkoutWeekStrip
          workouts={workouts}
          onPressWorkout={(workout) => router.push({ pathname: "/workout/summary", params: { id: workout.id } })}
          onSeeAll={() => router.push("/workout/history")}
        />
      )}
    </ScrollView>
  );
}
