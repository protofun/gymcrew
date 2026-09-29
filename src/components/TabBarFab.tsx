import { View } from "react-native";

export const FAB_SIZE = 58;

/** The mark on the + in the middle of the bottom bar (see TabBarFan): a chunky, rounded-off cross — deliberately not the thin Ionicons "add" glyph. */
export function PlusMark({ size, color }: { size: number; color: string }) {
  const thickness = size * 0.24;
  const radius = thickness / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", top: (size - thickness) / 2, left: 0, width: size, height: thickness, borderRadius: radius, backgroundColor: color }} />
      <View style={{ position: "absolute", left: (size - thickness) / 2, top: 0, width: thickness, height: size, borderRadius: radius, backgroundColor: color }} />
    </View>
  );
}

