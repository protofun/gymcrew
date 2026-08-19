import { Image, Text, View } from "react-native";

import { colors } from "@/theme";

const SIZE = 28;
const OVERLAP = 10;

type AvatarStackProps = {
  avatarUrls: string[];
  /** Total count this stack represents — an overflow bubble shows the difference vs avatarUrls.length. */
  totalCount?: number;
  max?: number;
};

export function AvatarStack({ avatarUrls, totalCount, max = 3 }: AvatarStackProps) {
  const shown = avatarUrls.slice(0, max);
  const overflow = (totalCount ?? avatarUrls.length) - shown.length;

  return (
    <View className="flex-row items-center">
      {shown.map((url, index) => (
        <Image
          key={url}
          source={{ uri: url }}
          className="rounded-full border-2 border-surface bg-divider"
          style={{ width: SIZE, height: SIZE, marginLeft: index === 0 ? 0 : -OVERLAP }}
        />
      ))}
      {overflow > 0 && (
        <View
          className="items-center justify-center rounded-full border-2 border-surface bg-background"
          style={{ width: SIZE, height: SIZE, marginLeft: -OVERLAP }}
        >
          <Text style={{ fontSize: 10, color: colors.neutral.textSecondary }} className="font-body-semibold">
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
