import { router } from "expo-router";
import { Image, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { images } from "@/constants/images";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { spring } from "@/theme";

export default function OnboardingWelcomeScreen() {
  const posthog = usePostHog();

  return (
    <OnboardingScreen
      hideBack
      scroll={false}
      centered
      progress={onboardingProgress("welcome")}
      title="Welcome to GymCrew"
      subtitle="Let's set up your profile and start your journey."
      hero={
        <Animated.View entering={ZoomIn.delay(150).springify().damping(spring.press.damping).mass(spring.press.mass)} className="items-center">
          <View style={{ width: 230, height: 230 }} className="items-center justify-end overflow-hidden">
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 250, height: 250 * (205 / 250) }} />
          </View>
        </Animated.View>
      }
      footer={
        <PrimaryButton
          label="Let's Go"
          onPress={() => {
            posthog.capture("onboarding_welcome_completed");
            router.push("/onboarding/personal-info");
          }}
        />
      }
    />
  );
}
