import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";

import AnimatedInput from "@/components/ui/base/animated-input-bar";
import type { IAnimatedInput } from "@/components/ui/base/animated-input-bar/types";
import { colors, radius } from "@/theme";

type FormFieldProps = Omit<IAnimatedInput, "placeholders" | "containerStyle" | "inputWrapperStyle"> & {
  label: string;
  placeholder?: string;
  rightAdornment?: ReactNode;
};

/**
 * Built on Reacticx's `animated-input-bar` — a single-entry `placeholders` array keeps its
 * character-by-character reveal animation without ever cycling (the primitive is designed for
 * rotating prompt text; one entry means it never has anything to rotate to). Trade-off accepted
 * per "use it as documented, don't rebuild its look": the old persistent label-above-value pattern
 * is gone — once typed, the field identifies itself only by content, the same placeholder-only
 * convention most primitive-driven forms use. The focus-border highlight is recreated via local
 * `onFocus`/`onBlur` state driving `inputWrapperStyle`, since the primitive has no built-in
 * focus-color prop.
 */
export function FormField({ label, placeholder, rightAdornment, onFocus, onBlur, ...inputProps }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ position: "relative", justifyContent: "center" }}>
      <AnimatedInput
        placeholders={[placeholder ?? label]}
        containerStyle={{ marginVertical: 0 }}
        inputWrapperStyle={{
          borderRadius: radius.small,
          borderWidth: 1,
          borderColor: focused ? colors.brand.yellow : colors.neutral.divider,
          backgroundColor: colors.neutral.surface,
          paddingHorizontal: 16,
          paddingRight: rightAdornment ? 44 : 16,
        }}
        inputStyle={{ color: colors.neutral.textPrimary, fontSize: 16 }}
        placeholderStyle={{ color: colors.neutral.textSecondary }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...inputProps}
      />
      {rightAdornment && <View style={{ position: "absolute", right: 16 }}>{rightAdornment}</View>}
    </View>
  );
}
