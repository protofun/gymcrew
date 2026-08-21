import { Image, View } from "react-native";

import { rankTierImages } from "@/constants/images";
import type { RankTier } from "@/lib/rank";

type RankBadgeProps = {
  tier: RankTier;
  size: number;
  dimmed?: boolean;
};

export function RankBadge({ tier, size, dimmed = false }: RankBadgeProps) {
  return (
    <View className="items-center justify-center" style={{ width: size, height: size, opacity: dimmed ? 0.35 : 1 }}>
      <Image source={rankTierImages[tier]} resizeMode="contain" style={{ width: size, height: size }} />
    </View>
  );
}
