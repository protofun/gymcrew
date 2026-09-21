import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type RefObject } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { colors, fontFamily } from "@/theme";

const TIPS = ["Fit the whole plate in the frame", "Shoot from above for the best estimate", "Good light means better macros"];

type AiScanCameraProps = {
  cameraRef: RefObject<CameraView | null>;
  /** Scans left today — `null` for accounts with unlimited scans. */
  remaining: number | null;
  error: string | null;
  capturing: boolean;
  onCapture: () => void;
  onPickFromLibrary: () => void;
  onClose: () => void;
};

const CORNER_SIZE = 38;
const CORNER_WIDTH = 4;

/** One bracket of the viewfinder — a rounded L-shape in the accent color. */
function Corner({ top, left }: { top: boolean; left: boolean }) {
  return (
    <View
      style={{
        position: "absolute",
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        [top ? "top" : "bottom"]: 0,
        [left ? "left" : "right"]: 0,
        [top ? "borderTopWidth" : "borderBottomWidth"]: CORNER_WIDTH,
        [left ? "borderLeftWidth" : "borderRightWidth"]: CORNER_WIDTH,
        [`border${top ? "Top" : "Bottom"}${left ? "Left" : "Right"}Radius`]: 22,
        borderColor: AI_SCAN.accent,
      }}
    />
  );
}

/** Four corner brackets that breathe slowly, so the frame feels alive while you line the plate up. */
function Viewfinder({ size }: { size: number }) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

  const style = useAnimatedStyle(() => ({ opacity: 0.55 + breathe.value * 0.45, transform: [{ scale: 1 + breathe.value * 0.03 }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Corner top left />
      <Corner top left={false} />
      <Corner top={false} left />
      <Corner top={false} left={false} />
    </Animated.View>
  );
}

/** The big round shutter: a ring that pulses outwards, and a disc that squishes when pressed. */
function ShutterButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const press = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.5 }] }));
  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Pressable
      disabled={busy}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      onPressIn={() => {
        press.value = withSpring(0.88, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 10, stiffness: 260 });
      }}
      accessibilityLabel="Take photo"
    >
      <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: AI_SCAN.accent }, ringStyle]} />
        <Animated.View style={[{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.brand.white, alignItems: "center", justifyContent: "center" }, discStyle]}>
          {busy ? <ActivityIndicator color={AI_SCAN.accent} /> : <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: AI_SCAN.accent }} />}
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** The capture step of the AI meal scan: live camera, an animated title and tips, a breathing
 * viewfinder and a pulsing shutter. All the pieces here are the new Reacticx-based ones. */
export function AiScanCamera({ cameraRef, remaining, error, capturing, onCapture, onPickFromLibrary, onClose }: AiScanCameraProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frameSize = Math.min(width - 72, 320);
  const [tipIndex, setTipIndex] = useState(0);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((index) => (index + 1) % TIPS.length), 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" enableTorch={torch} />

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.7)", "transparent", "transparent", "rgba(0,0,0,0.8)"]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16 }} className="flex-row items-start justify-between">
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={{ backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
          className="h-11 w-11 items-center justify-center rounded-full border"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color={colors.brand.white} />
        </Pressable>

        <View className="items-center gap-2">
          <AnimatedText
            text="SCAN YOUR MEAL"
            animationConfig={{ characterDelay: 28 }}
            enterFrom={{ translateY: 30, scale: 0.4 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 1.2, color: colors.brand.white }}
          />
          {remaining !== null && (
            <Animated.View
              entering={FadeInDown.delay(500).springify()}
              style={{ backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
            >
              <Ionicons name="sparkles" size={13} color={AI_SCAN.accent} />
              <Text className="caption font-body-semibold text-brand-white">{`${remaining} AI scan${remaining === 1 ? "" : "s"} left today`}</Text>
            </Animated.View>
          )}
        </View>

        <View className="h-11 w-11" />
      </View>

      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: Math.max(insets.top + 130, height * 0.5 - frameSize * 0.62) }} className="items-center">
        <Viewfinder size={frameSize} />
      </View>

      <View style={{ position: "absolute", bottom: insets.bottom + 24, left: 16, right: 16 }} className="items-center gap-5">
        <View style={{ minHeight: 56 }} className="items-center justify-center px-2">
          <AnimatedText
            text={TIPS[tipIndex]}
            animationConfig={{ characterDelay: 12 }}
            enterFrom={{ translateY: 16, scale: 0.6 }}
            style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: AI_SCAN.textOnMedia, textAlign: "center" }}
          />
        </View>

        {error && (
          <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOut}
            style={{ backgroundColor: "rgba(255,59,48,0.18)", borderColor: "rgba(255,59,48,0.5)" }}
            className="self-stretch rounded-2xl border px-4 py-3"
          >
            <Text className="body-sm text-center text-brand-white">{error}</Text>
          </Animated.View>
        )}

        <View className="flex-row items-center justify-between self-stretch px-6">
          <Pressable
            onPress={onPickFromLibrary}
            hitSlop={8}
            style={{ backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
            className="h-14 w-14 items-center justify-center rounded-full border"
            accessibilityLabel="Choose from library"
          >
            <Ionicons name="images-outline" size={24} color={colors.brand.white} />
          </Pressable>
          <ShutterButton busy={capturing} onPress={onCapture} />
          <Pressable
            onPress={() => setTorch((on) => !on)}
            hitSlop={8}
            style={{ backgroundColor: torch ? AI_SCAN.accent : AI_SCAN.overlay, borderColor: torch ? AI_SCAN.accent : AI_SCAN.overlayBorder }}
            className="h-14 w-14 items-center justify-center rounded-full border"
            accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
          >
            <Ionicons name={torch ? "flash" : "flash-outline"} size={24} color={torch ? AI_SCAN.onAccent : colors.brand.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
