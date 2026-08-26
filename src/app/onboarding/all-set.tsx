import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { colors } from "@/theme";

export default function AllSetScreen() {
  const { isSignedIn } = useAuth();

  // Reaching the wizard while already signed in happens when an existing account has no
  // "completed onboarding" record anywhere yet (fresh browser + a Clerk account from before that
  // flag existed — see lib/clerk.ts). That's not a new account to create: pushing to /sign-up
  // would sign this session out first (see sign-up.tsx's account-isolation guard) and lose it
  // entirely. Just continue as this account instead.
  function handleContinue() {
    if (isSignedIn) {
      router.replace("/");
    } else {
      router.push("/sign-up");
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.neutral.background }}
    >
      <View className="flex-1 px-6 pb-6 pt-4">
        <Animated.View
          entering={FadeInDown.springify().damping(14).mass(0.6)}
          className="items-center gap-2"
        >
          <Text className="font-body-bold text-5xl italic text-brand-yellow">
            You&apos;re All Set!
          </Text>
          <Text className="font-body-medium text-center text-xl leading-snug text-text-secondary">
            Let&apos;s get to work and become unstoppable.
          </Text>
        </Animated.View>

        <View className="flex-1 items-center justify-center">
          <Animated.Image
            entering={ZoomIn.delay(150).springify().damping(11).mass(0.7)}
            source={images.mascotSplash}
            style={{ width: 400, height: 400 * (250 / 261) }}
            resizeMode="contain"
          />
        </View>

        <OnboardingFooter
          label="Start My Journey"
          activeIndex={3}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
