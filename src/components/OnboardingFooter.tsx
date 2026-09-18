import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { OnboardingDots } from "@/components/OnboardingDots";
import { colors, spring } from "@/theme";

type OnboardingFooterProps = {
  label: string;
  activeIndex: number;
  dotCount?: number;
  onPress?: () => void;
  loading?: boolean;
};

export function OnboardingFooter({ label, activeIndex, dotCount = 4, onPress, loading = false }: OnboardingFooterProps) {
  return (
    <Animated.View entering={FadeInUp.delay(150).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} className="gap-5">
      <Pressable
        onPress={loading ? undefined : onPress}
        disabled={loading}
        className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        style={({ pressed }) => ({ opacity: pressed || loading ? 0.85 : 1 })}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand.iron} />
        ) : (
          <>
            <Text className="heading-4 text-brand-iron">{label}</Text>
            <Text className="heading-4 text-brand-iron">›</Text>
          </>
        )}
      </Pressable>

      <OnboardingDots count={dotCount} activeIndex={activeIndex} />
    </Animated.View>
  );
}
