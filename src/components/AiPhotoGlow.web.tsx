import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { AI_SCAN } from "@/constants/ai-scan-theme";

type AiPhotoGlowProps = {
  photoUri: string;
  done: boolean;
  onExited: () => void;
};

/** Web version of AiPhotoGlow — a pulsing gradient frame around a slowly zooming photo instead of
 * the Skia shader. Same contract: `onExited` fires shortly after `done`. */
export function AiPhotoGlow({ photoUri, done, onExited }: AiPhotoGlowProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onExited, 600);
    return () => clearTimeout(timer);
  }, [done, onExited]);

  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.04 }] }));
  const frameStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55 }));

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, frameStyle, { borderWidth: 6, borderColor: AI_SCAN.glow[1] }]} />
    </View>
  );
}
