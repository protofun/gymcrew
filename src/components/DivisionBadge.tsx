import { Image, View } from "react-native";

import { divisionImages } from "@/constants/images";
import type { Division } from "@/lib/division";

type DivisionBadgeProps = {
  division: Division;
  size: number;
  dimmed?: boolean;
};

export function DivisionBadge({ division, size, dimmed = false }: DivisionBadgeProps) {
  return (
    <View className="items-center justify-center" style={{ width: size, height: size, opacity: dimmed ? 0.35 : 1 }}>
      <Image source={divisionImages[division]} resizeMode="contain" style={{ width: size, height: size }} />
    </View>
  );
}
