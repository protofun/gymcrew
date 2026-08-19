import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { crewIconByKey } from "@/data/crew-icons";
import { colors } from "@/theme";

type CrewIconBadgeProps = {
  iconKey: string;
  size: number;
  tint?: string;
};

export function CrewIconBadge({ iconKey, size, tint = colors.brand.yellow }: CrewIconBadgeProps) {
  const icon = crewIconByKey(iconKey);

  if (icon.type === "image") {
    return <Image source={icon.source} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View
      className="items-center justify-center bg-surface"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <MaterialCommunityIcons name={icon.name} size={size * 0.5} color={tint} />
    </View>
  );
}
