import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, fontFamily, spring } from "@/theme";

type SelectTileProps = {
  selected: boolean;
  onPress: () => void;
  title: string;
  caption?: string;
  /** One of the app's illustrations. */
  image?: ImageSourcePropType;
  /** "tile" stacks the picture over the title, filling whatever width its parent gives it (a grid); "row" puts it left of the text (a list). */
  layout?: "tile" | "row";
};

const IMAGE_SIZE = { tile: 60, row: 52 } as const;

/** A choice you tap: its border and tint fade to yellow, the picture pops and tilts, and a check drops in.
 * Used for goals, experience levels and the crew paths. */
export function SelectTile({ selected, onPress, title, caption, image, layout = "tile" }: SelectTileProps) {
  const progress = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, spring.press);
  }, [selected, progress]);

  const frameStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.neutral.surface, "#2A2A1E"]),
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1.12]) }, { rotate: `${interpolate(progress.value, [0, 1], [0, -6])}deg` }],
    opacity: interpolate(progress.value, [0, 1], [0.75, 1]),
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: progress.value }] }));

  const size = IMAGE_SIZE[layout];
  const isTile = layout === "tile";

  return (
    <Pressable onPress={onPress} onPressIn={() => (pressed.value = withSpring(1, spring.press))} onPressOut={() => (pressed.value = withSpring(0, spring.press))} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[{ borderWidth: 1.5, borderRadius: 22 }, isTile && { minHeight: 148, justifyContent: "center" }, frameStyle]} className={isTile ? "items-center gap-2 px-3 py-5" : "flex-row items-center gap-4 px-4 py-3.5"}>
        {image ? (
          <Animated.View style={imageStyle}>
            <Image source={image} resizeMode="contain" style={{ width: size, height: size }} />
          </Animated.View>
        ) : null}
        <View className={isTile ? "items-center gap-0.5" : "flex-1 gap-0.5"}>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: isTile ? 22 : 24, letterSpacing: 0.8, color: colors.brand.white, textAlign: isTile ? "center" : "left" }}>{title.toUpperCase()}</Text>
          {caption ? <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: colors.neutral.textSecondary, textAlign: isTile ? "center" : "left" }}>{caption}</Text> : null}
        </View>
        <Animated.View style={checkStyle} className={`h-6 w-6 items-center justify-center rounded-full bg-brand-yellow ${isTile ? "absolute right-2.5 top-2.5" : ""}`}>
          <Ionicons name="checkmark" size={15} color={colors.brand.iron} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
