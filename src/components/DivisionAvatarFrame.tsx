import { Image, View, type ImageSourcePropType } from "react-native";

import { DivisionBadge } from "@/components/DivisionBadge";
import { DIVISION_COLOR, divisionIndex, type Division } from "@/lib/division";
import { colors } from "@/theme";

/**
 * The cosmetic division-leveling reward — a colored ring around the avatar, matching the division's
 * own color (see lib/division.ts DIVISION_COLOR), shown wherever a name/avatar appears (profile,
 * crew roster, member pages). Diamond+ gets a small division-badge flourish in the bottom-LEFT corner
 * — deliberately the opposite side from the online-status dot (crew roster) and photo-edit button
 * (profile), which both live bottom-right, so the flourish never collides with either. No glow, just
 * a richer frame at higher divisions.
 */
export function DivisionAvatarFrame({ source, division, size }: { source: ImageSourcePropType; division: Division; size: number }) {
  const color = DIVISION_COLOR[division];
  const ringWidth = Math.max(2, Math.round(size * 0.032));
  const showBadge = divisionIndex(division) >= divisionIndex("Diamond");
  const badgeSize = Math.round(size * 0.36);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: color,
          padding: 2,
          overflow: "hidden",
        }}
      >
        <Image source={source} className="bg-divider" style={{ width: "100%", height: "100%", borderRadius: size / 2 }} />
      </View>

      {showBadge && (
        <View
          style={{
            position: "absolute",
            left: -2,
            bottom: -2,
            borderRadius: badgeSize / 2,
            borderWidth: 2,
            borderColor: colors.neutral.background,
            backgroundColor: colors.neutral.background,
          }}
        >
          <DivisionBadge division={division} size={badgeSize} />
        </View>
      )}
    </View>
  );
}
