import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";

import { images } from "@/constants/images";
import { colors, fontFamily, spring } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` next to a className.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

/** The top of the sign-up and sign-in screens: the wordmark and the mascot, which floats gently up and down. */
export function AuthHero() {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.value }] }));

  return (
    <View className="items-center gap-1">
      <Animated.View entering={FadeInDown.springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} style={{ paddingHorizontal: 12 }}>
        <Text style={wordmarkStyle}>
          <Text style={{ color: colors.neutral.textPrimary }}>GYM</Text>
          <Text style={{ color: colors.brand.yellow }}>CREW</Text>
        </Text>
      </Animated.View>
      <Animated.View entering={ZoomIn.delay(150).springify().damping(spring.press.damping).mass(spring.press.mass)} style={floatStyle}>
        <Animated.Image source={images.mascotAuthScreen} style={{ width: 240, height: 240 * (430 / 760) }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
