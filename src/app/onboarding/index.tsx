import { router } from "expo-router";
import { SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { colors, typography } from "@/theme";

export default function OnboardingIntroScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      <View className="flex-1 px-6 pb-6 pt-4">
        <View className="flex-1 items-center justify-center gap-6">
          <Animated.Image
            entering={ZoomIn.springify().damping(11).mass(0.7)}
            source={images.mascotArmsCrossed}
            style={{ width: 256, height: 256 }}
            resizeMode="contain"
          />

          <Animated.View entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)}>
            <Text style={typography.heroItalic}>
              <Text style={{ color: colors.neutral.textPrimary }}>GYM</Text>
              <Text style={{ color: colors.brand.yellow }}>CREW</Text>
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(250).springify().damping(14).mass(0.6)}
            className="items-center"
          >
            <Text className="font-body-semibold text-2xl text-center uppercase tracking-wide text-text-primary">
              Stronger together.
            </Text>
            <Text className="font-body-semibold text-2xl text-center uppercase tracking-wide text-text-primary">
              Unstoppable together.
            </Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(350).springify().damping(14).mass(0.6)}
            className="font-body text-lg px-2 text-center leading-relaxed text-text-secondary"
          >
            Track workouts, build your crew, compete and become the best version
            of yourself.
          </Animated.Text>
        </View>

        <OnboardingFooter
          label="Get Started"
          activeIndex={0}
          onPress={() => router.push("/onboarding/welcome")}
        />
      </View>
    </SafeAreaView>
  );
}
