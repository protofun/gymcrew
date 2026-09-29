import { router } from "expo-router";
import { Image, useWindowDimensions, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { images } from "@/constants/images";
import { spring } from "@/theme";

const MASCOT_ASPECT_RATIO = 520 / 420;

export default function BuildCrewStartScreen() {
  const { width } = useWindowDimensions();
  const mascotWidth = Math.min(width - 24, 420);

  return (
    <OnboardingScreen
      scroll={false}
      centered
      title="Build your crew"
      subtitle="Stronger together. Unstoppable together."
      hero={
        <Animated.View entering={ZoomIn.delay(150).springify().damping(spring.press.damping).mass(spring.press.mass)} className="items-center">
          <View style={{ marginHorizontal: -24 }}>
            <Image source={images.mascotsCrew} style={{ width: mascotWidth, height: mascotWidth / MASCOT_ASPECT_RATIO }} resizeMode="contain" />
          </View>
        </Animated.View>
      }
      footer={<PrimaryButton label="Let's Build Your Crew" onPress={() => router.push("/build-crew/choose-path")} />}
    />
  );
}
