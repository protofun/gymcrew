import { useState, type ReactNode } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

import { colors } from "@/theme";

type FormFieldProps = TextInputProps & {
  label: string;
  rightAdornment?: ReactNode;
};

export function FormField({ label, rightAdornment, onFocus, onBlur, ...inputProps }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`flex-row items-center rounded-xl border bg-surface px-4 py-2 ${
        focused ? "border-brand-yellow" : "border-divider"
      }`}
    >
      <View className="flex-1">
        <Text className="body-sm text-text-secondary">{label}</Text>
        <TextInput
          placeholderTextColor={colors.neutral.textSecondary}
          className="body-lg text-text-primary"
          style={{ outlineWidth: 0, outlineColor: "transparent" }}
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
      </View>
      {rightAdornment}
    </View>
  );
}
