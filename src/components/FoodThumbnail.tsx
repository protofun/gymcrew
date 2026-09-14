import { Ionicons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { colors } from "@/theme";

type FoodThumbnailProps = {
  photoUrl?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
};

/** A real product/meal photo when one exists (Open Food Facts' own image, or a photo the user
 * attached to a custom food), falling back to a bold tinted icon tile when it doesn't — food is
 * inherently visual, and a wall of gray bordered rows with tiny gray icons is exactly the flat
 * "generic dashboard" look Nutrition should not have. Used everywhere a food is listed: search
 * results, the food picker, and the daily log. */
export function FoodThumbnail({ photoUrl, icon = "fast-food", color = colors.brand.yellow, size = 52 }: FoodThumbnailProps) {
  const radius = Math.round(size * 0.32);

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />;
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: `${color}26` }}
      className="items-center justify-center"
    >
      <Ionicons name={icon} size={Math.round(size * 0.42)} color={color} />
    </View>
  );
}
