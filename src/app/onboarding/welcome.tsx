import { SafeAreaView, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { colors } from "@/theme";

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <View className="gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-5xl leading-tight text-text-primary"
          >
            Welcome to
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-bold text-5xl leading-tight text-brand-yellow"
          >
            GymCrew
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(180).springify().damping(14).mass(0.6)}
            className="font-body-medium text-xl leading-snug text-text-secondary"
          >
            Let&apos;s set up your profile and start your journey.
          </Animated.Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Animated.Image
            entering={ZoomIn.delay(150).springify().damping(11).mass(0.7)}
            source={images.mascotFlexing}
            style={{ width: 382, height: 382 * (205 / 250) }}
            resizeMode="contain"
          />
        </View>

        <OnboardingFooter
          label="Let's Go"
          activeIndex={1}
          onPress={() => router.push("/onboarding/personal-info")}
        />
      </View>
    </SafeAreaView>
  );
}
