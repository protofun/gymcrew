import { Text, View } from "react-native";

import { colors } from "@/theme";

export type BarItem = { label: string; value: number; color?: string };

type HorizontalBarChartProps = {
  items: BarItem[];
  unit?: string;
};

export function HorizontalBarChart({ items, unit = "" }: HorizontalBarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <View className="gap-2.5">
      {items.map((item) => (
        <View key={item.label} className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="caption font-body-semibold text-text-secondary" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="caption font-body-bold text-text-primary">
              {item.value.toLocaleString("en-US")}
              {unit}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-background">
            <View
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: item.color ?? colors.brand.yellow }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
