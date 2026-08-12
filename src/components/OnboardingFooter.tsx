import { Pressable, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { OnboardingDots } from "@/components/OnboardingDots";

type OnboardingFooterProps = {
  label: string;
  activeIndex: number;
  dotCount?: number;
  onPress?: () => void;
};

export function OnboardingFooter({ label, activeIndex, dotCount = 4, onPress }: OnboardingFooterProps) {
  return (
    <Animated.View entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)} className="gap-5">
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Text className="heading-4 text-brand-iron">{label}</Text>
        <Text className="heading-4 text-brand-iron">›</Text>
      </Pressable>

      <OnboardingDots count={dotCount} activeIndex={activeIndex} />
    </Animated.View>
  );
}
