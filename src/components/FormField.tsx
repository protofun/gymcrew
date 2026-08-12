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
    <View className="gap-2">
      <Text className="body-md text-text-primary">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-surface px-4 ${
          focused ? "border-brand-yellow" : "border-divider"
        }`}
      >
        <TextInput
          placeholderTextColor={colors.neutral.textSecondary}
          className="body-md flex-1 py-4 text-text-primary"
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
        {rightAdornment}
      </View>
    </View>
  );
}
