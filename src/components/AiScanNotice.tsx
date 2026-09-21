import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { images } from "@/constants/images";
import { colors, fontFamily } from "@/theme";

type AiScanNoticeProps = {
  /** Keep it to a short line — each letter animates in on its own. */
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
};

/** A full-screen message for the AI scan — "camera access needed" and "you're out of scans today". The
 * mascot floats, the title animates in letter by letter, the buttons rise in. */
export function AiScanNotice({ title, body, primaryLabel, onPrimary, secondaryLabel, onSecondary }: AiScanNoticeProps) {
  const insets = useSafeAreaInsets();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 + float.value * 16 }] }));

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Animated.View style={floatStyle}>
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
          </Animated.View>
        </Animated.View>

        <AnimatedText
          text={title}
          animationConfig={{ characterDelay: 30 }}
          enterFrom={{ translateY: 32, scale: 0.3 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1.2, color: colors.brand.white }}
        />

        <Animated.Text entering={FadeInDown.delay(500).springify()} className="body-sm text-center" style={{ color: AI_SCAN.textMuted }}>
          {body}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(700).springify()} className="gap-3 px-6">
        <Pressable onPress={onPrimary} style={{ backgroundColor: AI_SCAN.accent }} className="items-center rounded-full py-3.5">
          <Text className="body-md font-body-bold" style={{ color: AI_SCAN.onAccent }}>
            {primaryLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onSecondary} style={{ backgroundColor: AI_SCAN.surface, borderColor: AI_SCAN.border }} className="items-center rounded-full border py-3.5">
          <Text className="body-md font-body-semibold text-brand-white">{secondaryLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
