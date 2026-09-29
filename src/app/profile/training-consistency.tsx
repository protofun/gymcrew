import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { TrainingConsistencyGrid } from "@/components/TrainingConsistencyGrid";
import { ContextMenu } from "@/components/ui/molecules/context-menu";
import { toDateKey } from "@/lib/date";
import { buildConsistencyYear, workoutCountByDate, yearsWithHistory, type ConsistencyCell } from "@/lib/training-consistency";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const RANGES = ["All time", "This year"] as const;
type Range = (typeof RANGES)[number];

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 11, height: 11, borderRadius: 2.5, backgroundColor: color }} />
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

/** Training consistency, one square per day — the same GitHub-contribution-style year grid the
 * "how consistent are you really" gym-content genre uses, a whole page of its own rather than
 * another section wedged into Training History, since a year at a glance genuinely needs the room.
 * Reuses `lib/training-consistency.ts`'s pure grid builder and Reacticx `context-menu` for the range
 * dropdown (`openTrigger="press"` — the same real tap-to-open dropdown pattern as `crew/activity.tsx`'s
 * `FilterMenu`, not a decorative label). */
export default function TrainingConsistencyScreen() {
  const insets = useSafeAreaInsets();
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const [range, setRange] = useState<Range>("All time");

  const now = useMemo(() => new Date(), []);
  const countsByDate = useMemo(() => workoutCountByDate(workouts), [workouts]);
  const allYears = useMemo(() => yearsWithHistory(workouts, now), [workouts, now]);
  const years = range === "This year" ? allYears.slice(0, 1) : allYears;

  function goToDay(cell: ConsistencyCell) {
    const workout = workouts.find((candidate) => toDateKey(new Date(candidate.completedAt)) === cell.dateKey);
    if (workout) router.push({ pathname: "/workout/summary", params: { id: workout.id } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/profile/history")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Training Consistency</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 28 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row flex-wrap items-center gap-3">
            <LegendSwatch color={colors.brand.yellow} label="2+ Workouts" />
            <LegendSwatch color={`${colors.brand.yellow}55`} label="1 Workout" />
            <LegendSwatch color={colors.neutral.divider} label="No training" />
          </View>

          <ContextMenu theme="dark">
            <ContextMenu.Trigger openTrigger="press">
              <View className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5">
                <Text className="caption font-body-semibold text-text-secondary">{range}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
              </View>
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              {RANGES.map((option) => (
                <ContextMenu.Item key={option} onPress={() => setRange(option)}>
                  {option === range && (
                    <ContextMenu.Item.Icon>
                      <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />
                    </ContextMenu.Item.Icon>
                  )}
                  <ContextMenu.Item.Label>{option}</ContextMenu.Item.Label>
                </ContextMenu.Item>
              ))}
            </ContextMenu.Content>
          </ContextMenu>
        </View>

        {years.length === 0 ? (
          <View className="items-center gap-2 py-14">
            <Ionicons name="calendar-outline" size={28} color={colors.neutral.textSecondary} />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.neutral.textSecondary }}>No workouts logged yet.</Text>
          </View>
        ) : (
          years.map((year) => <TrainingConsistencyGrid key={year} year={year} weeks={buildConsistencyYear(year, countsByDate)} onPressDay={goToDay} />)
        )}
      </ScrollView>
    </View>
  );
}
