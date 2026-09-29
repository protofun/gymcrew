import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { EXERCISE_BY_ID } from "@/data/exercises";
import type { WorkoutTemplate } from "@/data/workout-templates";
import { colors } from "@/theme";

const LONG_PRESS_DELAY = 450;

type WorkoutTemplateCardProps = {
  template: WorkoutTemplate;
  onPress: () => void;
  /** Optional — when provided, the row also builds a background-tint + scale animation over
   * `LONG_PRESS_DELAY` while held, so a hold visibly "charges up" before it fires. */
  onLongPress?: () => void;
};

/** One template or saved workout — the same flowing, icon-led row every other list in the app uses
 * now (`HomeRowLead`, hairline divider), not a bordered card per item. The charge-up hold animation
 * still tints the whole row and scales it down slightly, just without a box to draw a border around. */
export function WorkoutTemplateCard({ template, onPress, onLongPress }: WorkoutTemplateCardProps) {
  const exerciseNames = template.exerciseIds.map((id) => EXERCISE_BY_ID[id]?.name).filter(Boolean);
  const holdProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - holdProgress.value * 0.02 }],
    backgroundColor: interpolateColor(holdProgress.value, [0, 1], ["transparent", "rgba(227,255,0,0.08)"]),
  }));

  function handlePressIn() {
    if (onLongPress) holdProgress.value = withTiming(1, { duration: LONG_PRESS_DELAY });
  }

  function handlePressOut() {
    holdProgress.value = withTiming(0, { duration: 180 });
  }

  return (
    <Animated.View style={[{ borderRadius: 14 }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={LONG_PRESS_DELAY}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="flex-row items-center gap-3 border-b border-divider px-1 py-3.5"
      >
        <HomeRowLead kind="flat">
          <Ionicons name={template.icon} size={18} color={colors.brand.yellow} />
        </HomeRowLead>

        <View className="flex-1 gap-0.5">
          <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]}>{template.name.toUpperCase()}</Text>
          <Text style={HOME_ROW_DETAIL} numberOfLines={1}>
            {exerciseNames.length} exercises · {exerciseNames.join(", ")}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}
