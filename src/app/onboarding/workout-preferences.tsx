import { useState } from "react";
import { Pressable, SafeAreaView, Switch, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { TRAINING_SPLITS } from "@/data/training-splits";
import { colors } from "@/theme";

const DURATIONS = ["30 min", "45 min", "60+ min"] as const;
const MIN_WORKOUTS_PER_WEEK = 1;
const MAX_WORKOUTS_PER_WEEK = 7;

export default function WorkoutPreferencesScreen() {
  const [trainingSplit, setTrainingSplit] = useState<string>("Push / Pull / Legs");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(4);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("60+ min");
  const [restTimer, setRestTimer] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Workout Preferences" subtitle="How do you like to train?" />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center gap-6 py-6" showsVerticalScrollIndicator={false}>
          <SearchableSelectField
            label="Training Split"
            value={trainingSplit}
            options={TRAINING_SPLITS}
            onChange={setTrainingSplit}
          />

          <View className="gap-2">
            <Text className="body-md text-text-primary">Workouts per Week</Text>
            <View className="flex-row items-center gap-6">
              <Pressable
                onPress={() => setWorkoutsPerWeek((count) => Math.max(MIN_WORKOUTS_PER_WEEK, count - 1))}
                className="h-11 w-11 items-center justify-center rounded-xl border border-divider bg-surface"
              >
                <Text className="heading-4 text-text-primary">−</Text>
              </Pressable>
              <Text className="heading-4 text-text-primary">{workoutsPerWeek}</Text>
              <Pressable
                onPress={() => setWorkoutsPerWeek((count) => Math.min(MAX_WORKOUTS_PER_WEEK, count + 1))}
                className="h-11 w-11 items-center justify-center rounded-xl border border-divider bg-surface"
              >
                <Text className="heading-4 text-text-primary">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="gap-2">
            <Text className="body-md text-text-primary">Workout Duration</Text>
            <View className="flex-row gap-3">
              {DURATIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setDuration(option)}
                  className={`flex-1 items-center rounded-xl border bg-surface py-3 ${
                    duration === option ? "border-brand-yellow" : "border-divider"
                  }`}
                >
                  <Text className="body-md text-text-primary">{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="body-md text-text-primary">Rest Timer</Text>
            <Switch
              value={restTimer}
              onValueChange={setRestTimer}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.green }}
              thumbColor={colors.brand.white}
            />
          </View>
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={2} onPress={() => router.push("/onboarding/notifications")} />
      </View>
    </SafeAreaView>
  );
}
