import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

export type ConsistencyCell = { key: string; status: "hit" | "logged" | "none"; future: boolean; isToday: boolean };

type ProgressConsistencyProps = {
  /** Five weeks of days, Monday first, oldest week first. */
  cells: ConsistencyCell[];
  currentStreak: number;
  longestStreak: number;
  /** False when the user has no targets — then a logged day is as good as it gets. */
  hasTargets: boolean;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function cellColor(status: ConsistencyCell["status"]): string {
  if (status === "hit") return colors.brand.yellow;
  if (status === "logged") return "rgba(227,255,0,0.32)";
  return colors.neutral.surface;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

/** Five weeks of the food log as a grid of days — filled yellow when a day was on target, a paler yellow when
 * something was logged, dark when nothing was. The cells pop in one after another; the streaks sit beside it. */
export function ProgressConsistency({ cells, currentStreak, longestStreak, hasTargets }: ProgressConsistencyProps) {
  return (
    <View className="gap-4">
      <View className="flex-row gap-6">
        <View className="flex-row items-baseline gap-1.5">
          <NumberFlow value={currentStreak} fontSize={34} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text className="caption font-body-semibold text-text-secondary">{currentStreak === 1 ? "day streak" : "day streak"}</Text>
        </View>
        <View className="flex-row items-baseline gap-1.5">
          <NumberFlow value={longestStreak} fontSize={34} color={colors.neutral.textSecondary} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text className="caption font-body-semibold text-text-secondary">best</Text>
        </View>
      </View>

      <View>
        <View className="mb-2 flex-row">
          {WEEKDAYS.map((letter, index) => (
            <View key={index} className="flex-1 items-center">
              <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.neutral.textSecondary }}>{letter}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {cells.map((cell, index) => (
            <View key={cell.key} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <Animated.View
                entering={FadeIn.delay(index * 18).duration(300)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: cell.future ? "transparent" : cellColor(cell.status),
                  borderWidth: cell.isToday ? 2 : 0,
                  borderColor: colors.brand.white,
                }}
              />
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row gap-4">
        {hasTargets && <Legend color={colors.brand.yellow} label="On target" />}
        <Legend color="rgba(227,255,0,0.32)" label="Logged" />
        <Legend color={colors.neutral.surface} label="Nothing" />
      </View>
    </View>
  );
}
