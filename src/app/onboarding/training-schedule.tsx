import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { WEEKDAY_SHORT_LABEL, WEEKDAYS, type Weekday } from "@/data/weekdays";
import { getTemplatesForSplit } from "@/data/workout-templates";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily, spring } from "@/theme";

const CUSTOM_SPLIT = "Other / Custom";

/** One weekday in a row of seven: it fills yellow and pops when this workout is on it, and dims when another workout has it. */
function DayPill({ label, state, onPress }: { label: string; state: "selected" | "taken" | "free"; onPress: () => void }) {
  const on = useSharedValue(state === "selected" ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(state === "selected" ? 1 : 0, spring.press);
  }, [state, on]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.neutral.background, colors.brand.yellow]),
    borderColor: interpolateColor(on.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
    transform: [{ scale: 1 + on.value * 0.1 }],
  }));

  return (
    <Pressable onPress={onPress} disabled={state === "taken"} className="flex-1" style={{ opacity: state === "taken" ? 0.35 : 1 }}>
      <Animated.View style={[{ height: 40, borderRadius: 20, borderWidth: 1.5 }, style]} className="items-center justify-center">
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: state === "selected" ? colors.brand.iron : colors.neutral.textSecondary }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function TrainingScheduleScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const posthog = usePostHog();
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
    posthog.capture("onboarding_schedule_completed", { trainingDays: Object.keys(assignments).length });
    router.push("/onboarding/notifications");
  }

  return (
    <OnboardingScreen
      progress={onboardingProgress("training-schedule")}
      title="Weekly Schedule"
      subtitle={isCustom ? "What do you train on each day?" : "Assign your split to your week."}
      footer={<PrimaryButton label="Continue" onPress={handleContinue} />}
    >
      {isCustom
        ? WEEKDAYS.map((weekday) => (
            <View key={weekday} className="gap-2">
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 0.8, color: colors.brand.white }}>{weekday.toUpperCase()}</Text>
              <TextInput
                value={assignments[weekday] ?? ""}
                onChangeText={(text) => (text.trim() ? assignDay(text, weekday) : clearDay(weekday))}
                placeholder="Rest day"
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-2xl border-[1.5px] border-divider bg-surface px-4 py-3 text-text-primary"
                style={{ outlineWidth: 0, outlineColor: "transparent" }}
              />
            </View>
          ))
        : templates.map((template, index) => {
            const assignedDay = WEEKDAYS.find((weekday) => assignments[weekday] === template.name);
            return (
              <Animated.View key={template.key} entering={FadeInUp.delay(index * 70).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} className="gap-3 border-b border-divider pb-5">
                <View className="flex-row items-baseline justify-between">
                  <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 0.8, color: colors.brand.white }}>{template.name.toUpperCase()}</Text>
                  <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: assignedDay ? colors.brand.yellow : colors.neutral.textSecondary }}>{assignedDay ? assignedDay.toUpperCase() : "PICK A DAY"}</Text>
                </View>
                <View className="flex-row gap-1.5">
                  {WEEKDAYS.map((weekday) => {
                    const takenBy = assignments[weekday];
                    const state = takenBy === template.name ? "selected" : takenBy ? "taken" : "free";
                    return <DayPill key={weekday} label={WEEKDAY_SHORT_LABEL[weekday]} state={state} onPress={() => (state === "selected" ? clearDay(weekday) : assignDay(template.name, weekday))} />;
                  })}
                </View>
              </Animated.View>
            );
          })}
    </OnboardingScreen>
  );
}
