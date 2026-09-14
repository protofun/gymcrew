import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { ProgressBar } from "@/components/ProgressBar";
import { useWaterLogStore } from "@/store/water-log-store";
import { colors } from "@/theme";

const DAILY_GOAL_ML = 2000;
const QUICK_AMOUNTS_ML = [250, 500];

/** Daily water intake — near-universal in food loggers (MyFitnessPal, Cronometer, Lifesum all have
 * a version of this) but genuinely absent here before. One tap per glass/bottle, same "flat log,
 * undo removes the most recent tap" model as everything else in Nutrition. No per-user configurable
 * goal yet — 2L is a reasonable default, not worth its own settings screen for a v1. */
export function WaterTracker({ dateKey }: { dateKey: string }) {
  const posthog = usePostHog();
  const allEntries = useWaterLogStore((state) => state.entries);
  const addEntry = useWaterLogStore((state) => state.addEntry);
  const removeLast = useWaterLogStore((state) => state.removeLast);

  const entries = useMemo(() => allEntries.filter((entry) => entry.dateKey === dateKey), [allEntries, dateKey]);
  const totalMl = entries.reduce((sum, entry) => sum + entry.amountMl, 0);
  const ratio = totalMl / DAILY_GOAL_ML;

  function handleAdd(amount: number) {
    addEntry(amount, dateKey);
    posthog.capture("water_logged", { amount_ml: amount });
  }

  function handleUndo() {
    removeLast(dateKey);
    posthog.capture("water_log_undone");
  }

  return (
    <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="water" size={16} color={colors.semantic.info} />
          <Text className="body-sm font-body-bold text-text-secondary">WATER</Text>
        </View>
        <Text className="body-sm font-body-semibold text-text-primary">{`${(totalMl / 1000).toFixed(1)}L / ${(DAILY_GOAL_ML / 1000).toFixed(1)}L`}</Text>
      </View>

      <ProgressBar ratio={ratio} color={colors.semantic.info} height={6} />

      <View className="flex-row gap-2">
        {QUICK_AMOUNTS_ML.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => handleAdd(amount)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5"
            style={{ backgroundColor: `${colors.semantic.info}26` }}
          >
            <Ionicons name="add" size={14} color={colors.semantic.info} />
            <Text className="body-sm font-body-bold" style={{ color: colors.semantic.info }}>{`${amount}ml`}</Text>
          </Pressable>
        ))}
        {entries.length > 0 && (
          <Pressable onPress={handleUndo} hitSlop={8} className="items-center justify-center rounded-full px-3.5" style={{ backgroundColor: `${colors.semantic.info}26` }}>
            <Ionicons name="remove" size={16} color={colors.semantic.info} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
