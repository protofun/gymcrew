import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Button } from "@/components/ui/base/button";
import { colors, radius } from "@/theme";

type SocialProvider = "google" | "facebook" | "apple";

type SocialAuthButtonProps = {
  provider: SocialProvider;
  onPress?: () => void;
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  apple: "Continue with Apple",
};

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "facebook") {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#1877F2]">
        <Ionicons name="logo-facebook" size={16} color="#FFFFFF" />
      </View>
    );
  }
  if (provider === "apple") {
    return <Ionicons name="logo-apple" size={22} color="#FFFFFF" />;
  }
  return <Ionicons name="logo-google" size={20} color="#FFFFFF" />;
}

/** Built on Reacticx's `Button` primitive — gains a press-scale pop (0.95, matches `spring.press`'s
 * feel) that a plain `Pressable` didn't have before. `fullWidth` is a small addition to the
 * vendored primitive (see its `types.ts`): upstream defaults to intrinsic sizing, GymCrew's
 * buttons are always full-width. */
export function SocialAuthButton({ provider, onPress }: SocialAuthButtonProps) {
  return (
    <Button.Root
      onPress={onPress}
      fullWidth
      height={56}
      backgroundColor={colors.neutral.surface}
      borderRadius={radius.small}
      style={{ width: "100%", borderWidth: 1, borderColor: colors.neutral.divider }}
      accessibilityLabel={PROVIDER_LABEL[provider]}
    >
      <Button.Content style={{ flexDirection: "row", gap: 12 }}>
        <ProviderIcon provider={provider} />
        <Button.Label color={colors.neutral.textPrimary} size={16}>
          {PROVIDER_LABEL[provider]}
        </Button.Label>
      </Button.Content>
    </Button.Root>
  );
}
