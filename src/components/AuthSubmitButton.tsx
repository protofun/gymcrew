import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text } from "react-native";

import { Button } from "@/components/ui/base/button";
import { colors, radius } from "@/theme";

type AuthSubmitButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  /** `"default"` — full-width primary CTA with a trailing arrow, used for every real form submit
   * (sign in, sign up, send reset code, save new password). `"compact"` — the smaller
   * intrinsic-width retry button used on stuck/error states (sign-in's stuck-resume screen,
   * auth-handoff's error and missing-ticket screens). */
  variant?: "default" | "compact";
};

/**
 * Every auth screen had its own hand-rolled copy of this exact `Pressable` (full-width yellow
 * pill, arrow-forward icon, `disabled` + dimmed while submitting) repeated 4 times verbatim, plus
 * a second compact variant repeated 3 more times for retry buttons — extracted once here rather
 * than migrating each copy to Reacticx's `Button` independently. `loading` now crossfades to a
 * spinner (via `Button.Content`/`Button.Loading`) instead of the old static label-text swap
 * (e.g. "Log In" → "Logging In...") — a small, deliberate simplification that also makes every
 * auth/onboarding CTA in the app share the same loading language.
 */
export function AuthSubmitButton({ label, onPress, loading = false, variant = "default" }: AuthSubmitButtonProps) {
  const compact = variant === "compact";

  return (
    <Button.Root
      onPress={onPress}
      isLoading={loading}
      fullWidth={!compact}
      height={compact ? 44 : 56}
      backgroundColor={colors.brand.yellow}
      loadingBackgroundColor={colors.brand.yellow}
      borderRadius={radius.pill}
      style={compact ? { paddingHorizontal: 24 } : { width: "100%" }}
      accessibilityLabel={label}
    >
      <Button.Content style={{ flexDirection: "row", gap: 8 }}>
        <Text className={compact ? "body-md font-body-bold text-brand-iron" : "heading-4 text-brand-iron"}>{label}</Text>
        {!compact && <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />}
      </Button.Content>
      <Button.Loading>
        <ActivityIndicator color={colors.brand.iron} />
      </Button.Loading>
    </Button.Root>
  );
}
