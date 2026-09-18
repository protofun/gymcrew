import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { goBack } from "@/lib/navigation";
import { spring } from "@/theme";

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
        <Animated.Text
          entering={FadeInDown.springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
          className="font-body-bold text-5xl italic leading-tight text-brand-yellow"
        >
          {title}
        </Animated.Text>
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
