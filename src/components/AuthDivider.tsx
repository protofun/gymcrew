import { Text, View } from "react-native";

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "or continue with" }: AuthDividerProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-divider" />
      <Text className="body-sm text-text-secondary">{label}</Text>
      <View className="h-px flex-1 bg-divider" />
    </View>
  );
}
