import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

type OnboardingHeaderProps = {
  title: string;
  subtitle: string;
};

export function OnboardingHeader({ title, subtitle }: OnboardingHeaderProps) {
  return (
    <View className="gap-6">
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        className="h-6 w-6 items-center justify-center self-start"
      >
        <Text className="text-2xl text-text-primary">←</Text>
      </Pressable>

      <View className="gap-2">
        <Animated.Text
          entering={FadeInDown.springify().damping(14).mass(0.6)}
          className="font-body-bold text-5xl italic leading-tight text-brand-yellow"
        >
          {title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInUp.delay(100).springify().damping(14).mass(0.6)}
          className="font-body-medium text-xl leading-snug text-text-secondary"
        >
          {subtitle}
        </Animated.Text>
      </View>
    </View>
  );
}
