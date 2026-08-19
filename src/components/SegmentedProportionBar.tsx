import { Text, View } from "react-native";

export type ProportionSegment = { label: string; value: number; color: string };

type SegmentedProportionBarProps = {
  segments: ProportionSegment[];
  height?: number;
};

/** A single rounded bar split into proportional colored segments, with a legend (dot, label,
 * percentage) below — a cleaner alternative to a donut/pie chart for a small card. */
export function SegmentedProportionBar({ segments, height = 14 }: SegmentedProportionBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <View className="gap-3">
      <View className="flex-row overflow-hidden rounded-full bg-background" style={{ height }}>
        {segments.map((segment) => (
          <View key={segment.label} style={{ flex: total > 0 ? segment.value / total : 1, backgroundColor: segment.color }} />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
        {segments.map((segment) => {
          const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <View key={segment.label} className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
              <Text className="caption text-text-secondary">
                {segment.label} <Text className="font-body-bold text-text-primary">{percent}%</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
