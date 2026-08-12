import { SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { colors } from "@/theme";

export default function OnboardingIntroScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <View className="flex-1 items-center justify-center gap-6">
          <Animated.Image
            entering={ZoomIn.springify().damping(11).mass(0.7)}
            source={images.mascotArmsCrossed}
            style={{ width: 256, height: 256 }}
            resizeMode="contain"
          />

          <Animated.Text
            entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)}
            className="heading-1 text-center italic"
          >
            <Text className="text-text-primary">GYM</Text>
            <Text className="text-brand-yellow">CREW</Text>
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.delay(250).springify().damping(14).mass(0.6)}
            className="items-center"
          >
            <Text className="heading-4 text-center uppercase tracking-wide text-text-primary">
              Stronger together.
            </Text>
            <Text className="heading-4 text-center uppercase tracking-wide text-text-primary">
              Unstoppable together.
            </Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(350).springify().damping(14).mass(0.6)}
            className="body-md px-2 text-center leading-relaxed text-text-secondary"
          >
            Track workouts, build your crew, compete and become the best version of yourself.
          </Animated.Text>
        </View>

        <OnboardingFooter label="Get Started" activeIndex={0} onPress={() => router.push("/onboarding/welcome")} />
      </View>
    </SafeAreaView>
  );
}
