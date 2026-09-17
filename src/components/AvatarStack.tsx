import { Text, View } from "react-native";

import { Avatar } from "@/components/ui/primitives/avatar";
import { colors } from "@/theme";

const SIZE = 28;
const OVERLAP = 10;

type AvatarStackProps = {
  avatarUrls: string[];
  /** Total count this stack represents — an overflow bubble shows the difference vs avatarUrls.length. */
  totalCount?: number;
  max?: number;
};

/**
 * Built on Reacticx's `Avatar` primitive rather than a raw `Image`. Skips `Avatar.Fallback` —
 * its default mesh-gradient placeholder doesn't fit GymCrew's palette, and `Avatar.Root`'s own
 * `backgroundColor` already shows through on a failed/loading image exactly like the previous
 * `bg-divider` did, so the divider-colored circle is already the fallback.
 */
export function AvatarStack({ avatarUrls, totalCount, max = 3 }: AvatarStackProps) {
  const shown = avatarUrls.slice(0, max);
  const overflow = (totalCount ?? avatarUrls.length) - shown.length;

  return (
    <View className="flex-row items-center">
      {shown.map((url, index) => (
        <Avatar.Root
          key={url}
          size={SIZE}
          style={{
            marginLeft: index === 0 ? 0 : -OVERLAP,
            borderWidth: 2,
            borderColor: colors.neutral.surface,
            backgroundColor: colors.neutral.divider,
          }}
        >
          <Avatar.Image source={{ uri: url }} />
        </Avatar.Root>
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
