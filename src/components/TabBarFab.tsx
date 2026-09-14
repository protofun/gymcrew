import { Platform, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";

import { colors } from "@/theme";

export const FAB_SIZE = 58;
// How much of the FAB pokes up above the bar's top edge — smaller than half its own height, so it
// sits low and settled into the bar rather than floating way above it.
const FAB_RAISE = FAB_SIZE * 0.32;
const SPRING_CONFIG = { damping: 16, mass: 0.5, stiffness: 200 };
// A quiet, neutral lift for the FAB — depth, not a colored glow. GymCrew's other "raised" surfaces
// (cards, sheets) all use this same restrained elevation, so the FAB doesn't stand out as a
// different, flashier kind of UI than the rest of the app.
const FAB_SHADOW = Platform.select({
  ios: { shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 8 },
});

/** A chunky, rounded-off cross — deliberately not the thin Ionicons "add" glyph, so the FAB reads as
 * its own distinct mark rather than just another icon-in-a-circle like the rest of the bar. */
function PlusMark({ size, color }: { size: number; color: string }) {
  const thickness = size * 0.24;
  const radius = thickness / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", top: (size - thickness) / 2, left: 0, width: size, height: thickness, borderRadius: radius, backgroundColor: color }} />
      <View style={{ position: "absolute", left: (size - thickness) / 2, top: 0, width: thickness, height: size, borderRadius: radius, backgroundColor: color }} />
    </View>
  );
}

/**
 * The raised "+" FAB shared by the main `TabBar` and `NutritionNavBar` — same size, same twist-and-
 * pop press animation, same focused ring, so Nutrition's own section-local bottom bar reads as part
 * of the same app chrome instead of a cheaper copy. `focused` only ever applies to the main tab bar
 * (Nutrition's FAB pushes a separate "Add" screen, never a tab it can sit "on"), but stays a prop
 * here rather than hardcoded so either caller can opt in.
 */
export function TabBarFab({ onPress, focused = false }: { onPress: () => void; focused?: boolean }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  function handlePress() {
    // A one-shot twist-and-pop on tap — motion as the reward for pressing it, not a permanent
    // animation running whether you're touching it or not.
    scale.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 320 }), withSpring(1, SPRING_CONFIG));
    rotate.value = withSequence(withSpring(90, { damping: 9, stiffness: 260 }), withSpring(0, SPRING_CONFIG));
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.88, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      className="flex-1 items-center pb-2.5"
    >
      <Animated.View
        style={[
          {
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            marginTop: -FAB_RAISE,
            backgroundColor: colors.brand.yellow,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 4,
            borderColor: colors.neutral.background,
            ...FAB_SHADOW,
          },
          bubbleStyle,
        ]}
      >
        <Animated.View style={markStyle}>
          <PlusMark size={22} color={colors.brand.iron} />
        </Animated.View>
        {focused && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: FAB_SIZE + 8,
              height: FAB_SIZE + 8,
              borderRadius: (FAB_SIZE + 8) / 2,
              borderWidth: 2,
              borderColor: colors.brand.yellow,
            }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}
