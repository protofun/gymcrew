import type { Ionicons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { nutritionIcons } from "@/constants/images";
import { colors } from "@/theme";

type FoodThumbnailProps = {
  photoUrl?: string;
  /** Kept so existing callers keep compiling — the fallback is the app's own illustration now, whatever the food. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Tint of the tile behind the illustration. */
  color?: string;
  size?: number;
};

/** A real product/meal photo when one exists (Open Food Facts' own image, or a photo the user
 * attached to a custom food), falling back to a tinted tile with the app's bowl illustration when it
 * doesn't — food is inherently visual, and a wall of gray rows with tiny generic icons is exactly the
 * flat "generic dashboard" look Nutrition should not have. Used everywhere a food is listed: search
 * results, the food picker, and the daily log. */
export function FoodThumbnail({ photoUrl, color = colors.brand.yellow, size = 52 }: FoodThumbnailProps) {
  const radius = Math.round(size * 0.32);

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: `${color}1F` }} className="items-center justify-center">
      <Image source={nutritionIcons.myFoods} resizeMode="contain" style={{ width: size * 0.66, height: size * 0.66 }} />
    </View>
  );
}
