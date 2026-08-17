import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { EXERCISE_BY_ID } from "@/data/exercises";
import type { WorkoutTemplate } from "@/data/workout-templates";
import { colors } from "@/theme";

const LONG_PRESS_DELAY = 450;

type WorkoutTemplateCardProps = {
  template: WorkoutTemplate;
  onPress: () => void;
  /** Optional — when provided, the card also builds a scale + glow animation over
   * `LONG_PRESS_DELAY` while held, so a hold visibly "charges up" before it fires. */
  onLongPress?: () => void;
};

export function WorkoutTemplateCard({ template, onPress, onLongPress }: WorkoutTemplateCardProps) {
  const exerciseNames = template.exerciseIds.map((id) => EXERCISE_BY_ID[id]?.name).filter(Boolean);
  const holdProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - holdProgress.value * 0.03 }],
    borderColor: interpolateColor(holdProgress.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
  }));

  function handlePressIn() {
    if (onLongPress) holdProgress.value = withTiming(1, { duration: LONG_PRESS_DELAY });
  }

  function handlePressOut() {
    holdProgress.value = withTiming(0, { duration: 180 });
  }

  return (
    <Animated.View style={[{ borderRadius: 16, borderWidth: 1 }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={LONG_PRESS_DELAY}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="flex-row items-center gap-3 rounded-2xl bg-surface p-4"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-yellow/15">
          <Ionicons name={template.icon} size={22} color={colors.brand.yellow} />
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="body-lg font-body-semibold text-text-primary">{template.name}</Text>
          <Text className="caption text-text-secondary" numberOfLines={1}>
            {exerciseNames.length} exercises · {exerciseNames.join(", ")}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}
