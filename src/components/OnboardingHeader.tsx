import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { StaggeredText } from "@/components/ui/organisms/animated-text";
import { goBack } from "@/lib/navigation";
import { colors, fontFamily, spring } from "@/theme";

// StaggeredText's default blur-reveal doesn't render correctly on web (expo-blur's animated
// intensity misbehaves there) — disabled, keeping only the fade/slide/scale reveal.
const NO_BLUR = { maxBlurIntensity: 0 };

type OnboardingHeaderProps = {
  title: string;
  subtitle: string;
};

export function OnboardingHeader({ title, subtitle }: OnboardingHeaderProps) {
  return (
    <View className="gap-6">
      <Pressable
        onPress={() => goBack()}
        hitSlop={12}
        className="h-6 w-6 items-center justify-center self-start"
      >
        <Text className="text-2xl text-text-primary">←</Text>
      </Pressable>

      <View className="gap-2">
        <StaggeredText
          text={title}
          style={{ fontFamily: fontFamily.bodyBold, fontSize: 48, fontStyle: "italic", color: colors.brand.yellow }}
          animationConfig={NO_BLUR}
        />
        <Animated.Text
          entering={FadeInUp.delay(100).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
          className="font-body-medium text-xl leading-snug text-text-secondary"
        >
          {subtitle}
        </Animated.Text>
      </View>
    </View>
  );
}
