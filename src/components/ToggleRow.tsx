import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withSpring } from "react-native-reanimated";

import { colors, fontFamily, spring } from "@/theme";

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const TRACK_WIDTH = 54;
const TRACK_HEIGHT = 32;
const THUMB = 26;

/** A setting with an on/off switch whose thumb springs across and whose track fades to yellow. The whole row is the button. */
export function ToggleRow({ title, subtitle, image, value, onValueChange }: ToggleRowProps) {
  const position = useDerivedValue(() => withSpring(value ? 1 : 0, spring.press));

  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(position.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]) }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * (TRACK_WIDTH - THUMB - 6) }] }));

  return (
    <Pressable onPress={() => onValueChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} className="flex-row items-center gap-4 border-b border-divider py-4">
      {image ? <Image source={image} resizeMode="contain" style={{ width: 40, height: 40 }} /> : null}
      <View className="flex-1 gap-0.5">
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 16, color: colors.brand.white }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: fontFamily.bodyRegular, fontSize: 13, color: colors.neutral.textSecondary }}>{subtitle}</Text> : null}
      </View>
      <Animated.View style={[{ width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, padding: 3, justifyContent: "center" }, trackStyle]}>
        <Animated.View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: colors.brand.white }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}
