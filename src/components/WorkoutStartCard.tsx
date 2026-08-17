import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme";

type WorkoutStartCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
};

export function WorkoutStartCard({ icon, title, description, onPress, variant = "secondary" }: WorkoutStartCardProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-2xl px-4 py-4 ${
        isPrimary ? "bg-brand-yellow" : "border border-divider bg-surface"
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-full ${
            isPrimary ? "bg-brand-iron/10" : "border border-divider"
          }`}
        >
          <Ionicons name={icon} size={20} color={isPrimary ? colors.brand.iron : colors.brand.yellow} />
        </View>
        <View className="gap-0.5">
          <Text className={`body-lg font-body-semibold ${isPrimary ? "text-brand-iron" : "text-text-primary"}`}>
            {title}
          </Text>
          <Text className={`body-sm ${isPrimary ? "text-brand-iron/70" : "text-text-secondary"}`}>{description}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={isPrimary ? colors.brand.iron : colors.neutral.textSecondary} />
    </Pressable>
  );
}
