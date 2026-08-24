import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { colors, fontFamily } from "@/theme";

/**
 * The one metric-tile look for the whole app — matches the Crew tab's Stats "TOTAL_STATS" cards
 * exactly (flat card, icon top-left, value in the display font, label below), so a "Workouts"
 * number reads the same whether it's on your own profile, a workout split summary, or crew stats.
 */
export function StatTile({
  icon,
  value,
  label,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconColor?: string;
}) {
  return (
    <View className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-3">
      <Ionicons name={icon} size={15} color={iconColor ?? colors.brand.yellow} />
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 22 }} className="text-text-primary">
        {value}
      </Text>
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}
