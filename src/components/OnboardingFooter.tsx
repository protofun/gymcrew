import { ActivityIndicator, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Button } from "@/components/ui/base/button";
import { OnboardingDots } from "@/components/OnboardingDots";
import { colors, radius, spring } from "@/theme";

type OnboardingFooterProps = {
  label: string;
  activeIndex: number;
  dotCount?: number;
  onPress?: () => void;
  loading?: boolean;
};

/** Built on Reacticx's `Button` primitive — `isLoading` now crossfades the label into the spinner
 * instead of the old plain conditional swap, and presses get a `spring.press`-like scale pop the
 * previous `Pressable` version didn't have. */
export function OnboardingFooter({ label, activeIndex, dotCount = 4, onPress, loading = false }: OnboardingFooterProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(150).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
      className="gap-5"
    >
      <Button.Root
        onPress={onPress}
        isLoading={loading}
        fullWidth
        height={56}
        backgroundColor={colors.brand.yellow}
        loadingBackgroundColor={colors.brand.yellow}
        borderRadius={radius.pill}
        style={{ width: "100%" }}
        accessibilityLabel={label}
      >
        <Button.Content style={{ flexDirection: "row", gap: 8 }}>
          <Text className="heading-4 text-brand-iron">{label}</Text>
          <Text className="heading-4 text-brand-iron">›</Text>
        </Button.Content>
        <Button.Loading>
          <ActivityIndicator color={colors.brand.iron} />
        </Button.Loading>
      </Button.Root>

      <OnboardingDots count={dotCount} activeIndex={activeIndex} />
    </Animated.View>
  );
}
