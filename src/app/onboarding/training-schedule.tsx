import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { WEEKDAY_SHORT_LABEL, WEEKDAYS, type Weekday } from "@/data/weekdays";
import { getTemplatesForSplit } from "@/data/workout-templates";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const CUSTOM_SPLIT = "Other / Custom";

function WeekdayChip({
  label,
  state,
  onPress,
}: {
  label: string;
  state: "selected" | "taken" | "free";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={state === "taken"}
      className={`h-9 w-9 items-center justify-center rounded-full border ${
        state === "selected"
          ? "border-brand-yellow bg-brand-yellow"
          : state === "taken"
            ? "border-divider bg-background opacity-40"
            : "border-divider bg-background"
      }`}
    >
      <Text className={`caption font-body-semibold ${state === "selected" ? "text-brand-iron" : "text-text-secondary"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TrainingScheduleScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const trainingSplit = useOnboardingStore((state) => state.onboarding.trainingSplit);
  const [assignments, setAssignments] = useState<Partial<Record<Weekday, string>>>({});

  const isCustom = !trainingSplit || trainingSplit === CUSTOM_SPLIT;
  const templates = isCustom ? [] : getTemplatesForSplit(trainingSplit);

  function assignDay(workoutName: string, weekday: Weekday) {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Weekday[]) {
        if (next[key] === workoutName) delete next[key];
      }
      next[weekday] = workoutName;
      return next;
    });
  }

  function clearDay(weekday: Weekday) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[weekday];
      return next;
    });
  }

  function handleContinue() {
    setOnboardingData({ weeklySchedule: assignments });
    router.push("/onboarding/notifications");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader
          title="Weekly Schedule"
          subtitle={isCustom ? "What do you train on each day?" : "Assign your split to your week."}
        />

        <Animated.ScrollView
          entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)}
          className="flex-1"
          contentContainerClassName="gap-4 py-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isCustom
            ? WEEKDAYS.map((weekday) => (
                <View key={weekday} className="gap-2">
                  <Text className="body-md text-text-primary">{weekday}</Text>
                  <TextInput
                    value={assignments[weekday] ?? ""}
                    onChangeText={(text) => (text.trim() ? assignDay(text, weekday) : clearDay(weekday))}
                    placeholder="Rest day"
                    placeholderTextColor={colors.neutral.textSecondary}
                    className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
                    style={{ outlineWidth: 0, outlineColor: "transparent" }}
                  />
                </View>
              ))
            : templates.map((template) => {
                const assignedDay = WEEKDAYS.find((weekday) => assignments[weekday] === template.name);
                return (
                  <View key={template.key} className="gap-3 rounded-xl border border-divider bg-surface p-4">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name={template.icon} size={18} color={colors.brand.yellow} />
                      <Text className="body-md font-body-semibold text-text-primary">{template.name}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {WEEKDAYS.map((weekday) => {
                        const takenBy = assignments[weekday];
                        const state = takenBy === template.name ? "selected" : takenBy ? "taken" : "free";
                        return (
                          <WeekdayChip
                            key={weekday}
                            label={WEEKDAY_SHORT_LABEL[weekday]}
                            state={state}
                            onPress={() => (state === "selected" ? clearDay(weekday) : assignDay(template.name, weekday))}
                          />
                        );
                      })}
                    </View>
                    {assignedDay && <Text className="caption text-brand-yellow">Scheduled for {assignedDay}</Text>}
                  </View>
                );
              })}
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={3} dotCount={5} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
