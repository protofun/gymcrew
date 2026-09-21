import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors } from "@/theme";

export type ProgressStat = {
  label: string;
  value: number;
  unit?: string;
  /** Decimals to roll, e.g. 1 for litres. */
  decimals?: number;
  color: string;
  /** Change against the week before, in percent — `null` when there's nothing to compare. */
  delta?: number | null;
};

/** The week's numbers as a two-column grid divided by hairlines — no boxes. Every number rolls in, and a
 * small arrow says how it moved against the week before. */
export function ProgressStatGrid({ stats }: { stats: ProgressStat[] }) {
  return (
    <View className="flex-row flex-wrap">
      {stats.map((stat, index) => {
        const isLastRow = index >= stats.length - (stats.length % 2 === 0 ? 2 : 1);
        return (
          <Animated.View
            key={stat.label}
            entering={FadeInDown.delay(index * 60).springify().damping(16)}
            style={{ width: "50%" }}
            className={`gap-1 py-4 ${index % 2 === 0 ? "border-r pr-4" : "pl-4"} ${isLastRow ? "" : "border-b"} border-divider`}
          >
            <View className="flex-row items-baseline gap-1">
              <NumberFlow value={stat.value} decimals={stat.decimals} fontSize={32} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
              {stat.unit ? <Text className="caption font-body-semibold text-text-secondary">{stat.unit}</Text> : null}
            </View>
            <View className="flex-row items-center gap-1.5">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stat.color }} />
              <Text className="caption font-body-semibold text-text-secondary">{stat.label}</Text>
            </View>
            {stat.delta !== null && stat.delta !== undefined && stat.delta !== 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name={stat.delta > 0 ? "arrow-up" : "arrow-down"} size={11} color={colors.neutral.textSecondary} />
                <Text className="caption text-text-secondary">{`${Math.abs(stat.delta)}% vs last week`}</Text>
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
