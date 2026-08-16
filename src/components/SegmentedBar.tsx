import { Platform, View } from "react-native";

const SEGMENT_COUNT = 16;
const SEGMENT_GAP = 3;

const glowFor = (color: string) =>
  Platform.select({
    ios: { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
    default: { elevation: 2 },
  });

type SegmentedBarProps = {
  ratio: number;
  color: string;
  height?: number;
};

export function SegmentedBar({ ratio, color, height = 18 }: SegmentedBarProps) {
  const filledCount = Math.round(Math.min(1, Math.max(0, ratio)) * SEGMENT_COUNT);

  return (
    <View className="flex-row" style={{ height, gap: SEGMENT_GAP }}>
      {Array.from({ length: SEGMENT_COUNT }).map((_, index) =>
        index < filledCount ? (
          <View key={index} className="flex-1 rounded-sm" style={[{ backgroundColor: color }, glowFor(color)]} />
        ) : (
          <View key={index} className="flex-1 rounded-sm bg-divider" />
        ),
      )}
    </View>
  );
}
