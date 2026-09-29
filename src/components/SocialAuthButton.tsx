import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, spring } from "@/theme";

type SocialProvider = "google" | "facebook" | "apple";

type SocialAuthButtonProps = {
  provider: SocialProvider;
  onPress?: () => void;
  /** Position in the row — staggers the entrance. */
  index?: number;
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  apple: "Continue with Apple",
};

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "facebook") return <Ionicons name="logo-facebook" size={26} color="#1877F2" />;
  if (provider === "apple") return <Ionicons name="logo-apple" size={27} color={colors.neutral.textPrimary} />;
  return <Ionicons name="logo-google" size={24} color={colors.neutral.textPrimary} />;
}

/** One round sign-in-with-a-provider button — three of them sit in a row. Each pops in after the last and dips when pressed. */
export function SocialAuthButton({ provider, onPress, index = 0 }: SocialAuthButtonProps) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.1 }] }));

  return (
    <Animated.View entering={FadeInUp.delay(400 + index * 90).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (pressed.value = withSpring(1, spring.press))}
        onPressOut={() => (pressed.value = withSpring(0, spring.press))}
        accessibilityRole="button"
        accessibilityLabel={PROVIDER_LABEL[provider]}
      >
        <View style={{ width: 68, height: 68, borderRadius: 34 }} className="items-center justify-center border border-divider bg-surface">
          <ProviderIcon provider={provider} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
