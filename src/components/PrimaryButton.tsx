import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import { colors, fontFamily, spring } from "@/theme";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  /** Shows pulsing dots instead of the label and ignores presses. */
  loading?: boolean;
  disabled?: boolean;
  /** "ghost" is the quiet outlined version, for a second choice next to the main one. */
  variant?: "solid" | "ghost";
  /** No arrow — for buttons that don't move you forward. */
  hideArrow?: boolean;
};

/** The big pill button of the sign-up, wizard and crew screens: it dips on press while its arrow slides
 * forward, and pulses three dots while something loads. */
export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = "solid", hideArrow = false }: PrimaryButtonProps) {
  const pressed = useSharedValue(0);
  const solid = variant === "solid";
  const textColor = solid ? colors.brand.iron : colors.brand.yellow;

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.04 }] }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pressed.value * 6 }] }));

  return (
    <Animated.View style={buttonStyle}>
      <Pressable
        onPress={loading || disabled ? undefined : onPress}
        onPressIn={() => (pressed.value = withSpring(1, spring.press))}
        onPressOut={() => (pressed.value = withSpring(0, spring.press))}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ opacity: disabled ? 0.45 : 1, height: 56, borderRadius: 28, borderWidth: solid ? 0 : 1.5, borderColor: colors.brand.yellow, backgroundColor: solid ? colors.brand.yellow : "transparent" }}
        className="flex-row items-center justify-center gap-2"
      >
        {loading ? (
          <View style={{ height: 24, justifyContent: "center" }}>
            <PulsingDots color={textColor} radius={4} spacing={16} />
          </View>
        ) : (
          <>
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, lineHeight: 28, letterSpacing: 1, color: textColor }}>{label.toUpperCase()}</Text>
            {!hideArrow && (
              <Animated.View style={arrowStyle}>
                <Ionicons name="arrow-forward" size={20} color={textColor} />
              </Animated.View>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
