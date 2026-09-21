import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors, fontFamily } from "@/theme";

/** Web version of AiChromaButton — a gradient ring that breathes, instead of the Skia chrome shader. */
export function AiChromaButton({ onPress, size = 46 }: { onPress: () => void; size?: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));

  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel="Scan a meal with AI">
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, ringStyle]}>
          <LinearGradient colors={[...AI_SCAN.glow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ width: size - 5, height: size - 5, borderRadius: (size - 5) / 2, backgroundColor: colors.neutral.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 0.5, color: colors.brand.white }}>AI</Text>
        </View>
      </View>
    </Pressable>
  );
}
