import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { WorkoutTemplateCard } from "@/components/WorkoutTemplateCard";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { ALL_TEMPLATES, getTemplatesForSplit, type WorkoutTemplate } from "@/data/workout-templates";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

export default function WorkoutTemplatesScreen() {
  const insets = useSafeAreaInsets();
  const trainingSplit = useOnboardingStore((state) => state.onboarding.trainingSplit);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);
  const posthog = usePostHog();

  const splitTemplates = getTemplatesForSplit(trainingSplit);
  const splitTemplateKeys = new Set(splitTemplates.map((t) => t.key));
  const otherTemplates = ALL_TEMPLATES.filter((t) => !splitTemplateKeys.has(t.key));

  function handleStartTemplate(template: WorkoutTemplate) {
    startWorkout();
    setName(template.name);
    for (const exerciseId of template.exerciseIds) {
      const exercise = EXERCISE_BY_ID[exerciseId];
      if (exercise) addExercise(exercise);
    }
    posthog.capture("template_used", {
      template_name: template.name,
      template_key: template.key,
      exercise_count: template.exerciseIds.length,
    });
    posthog.capture("workout_started", { source: "template" });
    router.replace("/workout/active");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Choose from Templates</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 28, paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <View className="gap-0.5">
            <Text className="body-md font-body-semibold text-text-primary">
              {trainingSplit ? `Based on your split` : "Quick Start Templates"}
            </Text>
            <Text className="caption text-text-secondary">
              {trainingSplit ? trainingSplit : "Set a training split in your profile to get personalized picks"}
            </Text>
          </View>

          {splitTemplates.map((template) => (
            <WorkoutTemplateCard key={template.key} template={template} onPress={() => handleStartTemplate(template)} />
          ))}
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Browse All Templates</Text>
          {otherTemplates.map((template) => (
            <WorkoutTemplateCard key={template.key} template={template} onPress={() => handleStartTemplate(template)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
