import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type IconBadgeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  iconSize?: number;
};

/** A colored icon-in-a-tinted-circle badge — the "10% tint background, full-color icon" treatment
 * already used ad hoc around the app (e.g. WarAttackSummary's `bg-brand-yellow/15` circle).
 * Centralized here since Nutrition uses a different accent color per macro/section and a fixed
 * Tailwind opacity class can't take a dynamic color. */
export function IconBadge({ icon, color, size = 36, iconSize }: IconBadgeProps) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}1A` }}
      className="items-center justify-center"
    >
      <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.5)} color={color} />
    </View>
  );
}
