import { Text, View } from "react-native";

import { colors, fontFamily } from "@/theme";

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "or continue with" }: AuthDividerProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-divider" />
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 16, letterSpacing: 1, color: colors.neutral.textSecondary }}>{label.toUpperCase()}</Text>
      <View className="h-px flex-1 bg-divider" />
    </View>
  );
}
