import { useEffect, type ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, spring } from "@/theme";

/** A round choice in a picker (an icon, a color, a crew badge): the chosen one grows and gets a yellow ring. */
export function RingChoice({ selected, onPress, size = 64, children }: { selected: boolean; onPress: () => void; size?: number; children: ReactNode }) {
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(selected ? 1 : 0, spring.press);
  }, [selected, on]);

  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
    transform: [{ scale: 1 + on.value * 0.12 }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[{ height: size, width: size, borderRadius: size / 2, borderWidth: 2, overflow: "hidden" }, style]} className="items-center justify-center">
        {children}
      </Animated.View>
    </Pressable>
  );
}
