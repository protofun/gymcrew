import { useEffect, type ReactNode } from "react";
import { Text, type TextInputProps, View } from "react-native";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { FieldLabel } from "@/components/OnboardingScreen";
import AnimatedInputBar from "@/components/ui/base/animated-input-bar";
import { colors, fontFamily } from "@/theme";

type AuthFieldProps = Omit<TextInputProps, "placeholder"> & {
  label: string;
  /** Example values that type themselves in while the field is empty (Reacticx `animated-input-bar`). */
  placeholders: string[];
  error?: string | null;
  /** Something at the right end of the field — a show/hide password button. */
  right?: ReactNode;
};

/** A field for the sign-up, sign-in and wizard forms: a small label, an input whose empty state cycles
 * through examples, and a border that lights up yellow while you type (or red on an error). */
export function AuthField({ label, placeholders, error, right, onFocus, onBlur, ...inputProps }: AuthFieldProps) {
  const focus = useSharedValue(0);
  const failed = useSharedValue(error ? 1 : 0);

  useEffect(() => {
    failed.value = withTiming(error ? 1 : 0, { duration: 200 });
  }, [error, failed]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(failed.value, [0, 1], [interpolateColor(focus.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]), colors.semantic.error]),
  }));

  return (
    <View className="gap-2">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Animated.View style={[{ borderWidth: 1.5, borderRadius: 16, backgroundColor: colors.neutral.surface }, borderStyle]}>
        <AnimatedInputBar
          placeholders={placeholders}
          selectionColor={colors.brand.yellow}
          animationInterval={2800}
          containerStyle={{ marginVertical: 0 }}
          inputWrapperStyle={{ paddingHorizontal: 16, paddingVertical: 14, paddingRight: right ? 52 : 16, minHeight: 54 }}
          placeholderLeft={16}
          placeholderStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 16 }}
          inputStyle={{ fontFamily: fontFamily.bodySemiBold, fontSize: 16, outlineWidth: 0 } as object}
          onFocus={(event) => {
            focus.value = withTiming(1, { duration: 180 });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, { duration: 180 });
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {right ? <View className="absolute bottom-0 right-4 top-0 justify-center">{right}</View> : null}
      </Animated.View>
      {error ? <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.semantic.error }}>{error}</Text> : null}
    </View>
  );
}

/** A form-level error: it drops in above the button rather than just appearing. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Animated.Text entering={FadeInDown.duration(250)} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, lineHeight: 19, color: colors.semantic.error }}>
      {message}
    </Animated.Text>
  );
}
