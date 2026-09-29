import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Marquee } from "@/components/ui/base/marquee";
import { images } from "@/constants/images";
import { colors, fontFamily, spring, typography } from "@/theme";

const TICKER = ["TRACK WORKOUTS", "BUILD YOUR CREW", "COMPETE", "RANK UP", "PROVE YOUR PROGRESS"];

/** The first screen: the wordmark, a floating mascot, a strip of what the app does scrolling by, and one big
 * button ringed by a running golden light. */
export default function OnboardingIntroScreen() {
  const { isSignedIn } = useAuth();
  const posthog = usePostHog();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * float.value }] }));

  return (
    <OnboardingScreen
      hideBack
      scroll={false}
      centered
      title="Stronger together."
      subtitle="Track workouts, build your crew, compete and become the best version of yourself."
      hero={
        <View className="items-center gap-2">
          <Animated.View entering={FadeInDown.springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} style={{ paddingHorizontal: 20 }}>
            <Text style={typography.heroItalic}>
              <Text style={{ color: colors.neutral.textPrimary }}>GYM</Text>
              <Text style={{ color: colors.brand.yellow }}>CREW</Text>
            </Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(120).springify().damping(spring.press.damping).mass(spring.press.mass)} style={floatStyle}>
            <Animated.Image source={images.mascotArmsCrossed} style={{ width: 200, height: 200 }} resizeMode="contain" />
          </Animated.View>
        </View>
      }
      footer={
        <>
          <Animated.View entering={FadeInDown.delay(500).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}>
            <BrandBeamFrame borderRadius={32}>
              <View style={{ padding: 3, backgroundColor: colors.neutral.background }}>
                <PrimaryButton
                  label="Get Started"
                  // An account comes first — creating it before collecting any answers means every wizard
                  // step below can save straight to the real backend as you go, instead of being collected
                  // locally with nowhere to save to yet. A signed-in visitor here (e.g. resuming mid-wizard
                  // after closing the app) skips straight back into it instead of being asked to sign up again.
                  onPress={() => {
                    posthog.capture("onboarding_started");
                    router.push(isSignedIn ? "/onboarding/welcome" : "/sign-up");
                  }}
                />
              </View>
            </BrandBeamFrame>
          </Animated.View>

          {!isSignedIn && (
            <View className="flex-row justify-center gap-1 pt-1">
              <Text className="body-md text-text-secondary">Already have an account?</Text>
              <Pressable hitSlop={8} onPress={() => router.push("/sign-in")}>
                <Text className="body-md text-brand-yellow">Log in</Text>
              </Pressable>
            </View>
          )}
        </>
      }
    >
      <View style={{ height: 40, marginHorizontal: -24 }} className="justify-center border-y border-divider">
        <Marquee speed={28} spacing={0}>
          <View className="flex-row items-center">
            {TICKER.map((phrase) => (
              <View key={phrase} className="flex-row items-center">
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 1.5, color: colors.brand.white }}>{phrase}</Text>
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, color: colors.brand.yellow, marginHorizontal: 14 }}>✦</Text>
              </View>
            ))}
          </View>
        </Marquee>
      </View>
    </OnboardingScreen>
  );
}
