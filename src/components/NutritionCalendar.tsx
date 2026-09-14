import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { GoalRing } from "@/components/GoalRing";
import type { ApiFoodLog } from "@/lib/api";
import { getMonthGrid, isSameMonth, toDateKey } from "@/lib/date";
import { dayGoalStatus, dayHealthinessRatio } from "@/lib/nutrition-day-status";
import { sumMacros, type Macros } from "@/lib/nutrition-macros";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const RING_SIZE = 32;
const EMPTY_MACROS: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

type DaySegment = { type: "pill"; dates: Date[] } | { type: "ring"; date: Date } | { type: "blank" };

/**
 * Groups one calendar week into render segments: a run of consecutive "fully hit" days becomes one
 * `pill` (so e.g. Mon-Thu all landing on target draws as a single joined bar, not four separate
 * circles), everything else — missed, no data, or in the future — stays its own `ring` cell. Runs
 * never cross a week boundary, matching the reference layout (each row lays out independently).
 */
function buildWeekSegments(week: (Date | null)[], totalsByDay: Map<string, Macros>, targets: Macros, today: Date): DaySegment[] {
  const segments: DaySegment[] = [];
  let run: Date[] = [];

  function flushRun() {
    if (run.length > 0) {
      segments.push({ type: "pill", dates: run });
      run = [];
    }
  }

  for (const date of week) {
    if (!date) {
      flushRun();
      segments.push({ type: "blank" });
      continue;
    }
    const totals = totalsByDay.get(toDateKey(date)) ?? EMPTY_MACROS;
    const status = date <= today ? dayGoalStatus(totals, targets) : "no-data";
    if (status === "hit") {
      run.push(date);
    } else {
      flushRun();
      segments.push({ type: "ring", date });
    }
  }
  flushRun();
  return segments;
}

/**
 * Month calendar — consecutive fully-on-target days merge into one joined pill bar, every other day
 * (missed, untracked, or still upcoming) shows as its own ring filled to that day's real
 * `dayHealthinessRatio` (see nutrition-day-status.ts), with the date centered inside either way. See
 * NUTRITION.md section 4's "overview which days I did/didn't hit my goal" — same data as before,
 * a habit-tracker-style layout instead of a flat grid of independent circles.
 */
export function NutritionCalendar({ entries, targets }: { entries: ApiFoodLog[]; targets: Macros }) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const totalsByDay = useMemo(() => {
    const map = new Map<string, ApiFoodLog[]>();
    for (const entry of entries) map.set(entry.dateKey, [...(map.get(entry.dateKey) ?? []), entry]);
    const result = new Map<string, Macros>();
    for (const [key, dayEntries] of map) result.set(key, sumMacros(dayEntries));
    return result;
  }, [entries]);

  const weeks = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const isCurrentMonth = isSameMonth(visibleMonth, today);
  const weekSegments = useMemo(
    () => weeks.map((week) => buildWeekSegments(week, totalsByDay, targets, today)),
    [weeks, totalsByDay, targets, today],
  );

  const monthStats = useMemo(() => {
    let totalRatio = 0;
    let trackedDays = 0;
    for (const week of weeks) {
      for (const date of week) {
        if (!date || date > today) continue;
        const totals = totalsByDay.get(toDateKey(date));
        if (!totals || totals.calories === 0) continue;
        trackedDays++;
        totalRatio += dayHealthinessRatio(totals, targets);
      }
    }
    return { avgHealthiness: trackedDays > 0 ? totalRatio / trackedDays : 0, trackedDays };
  }, [weeks, totalsByDay, targets, today]);

  return (
    <View className="gap-4 rounded-3xl border border-divider bg-surface p-4">
      <View className="items-center gap-1">
        <View className="flex-row items-center gap-5">
          <Pressable onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
          </Pressable>
          <Text className="heading-4 text-text-primary">
            {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <Pressable
            onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            hitSlop={8}
            disabled={isCurrentMonth}
          >
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
        </View>
        <Text className="body-sm font-body-semibold" style={{ color: colors.semantic.success }}>
          {monthStats.trackedDays > 0 ? `${Math.round(monthStats.avgHealthiness * 100)}% Healthy` : "No tracked days yet"}
        </Text>
      </View>

      <View className="flex-row justify-between">
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={index} className="caption flex-1 text-center text-text-secondary">
            {label}
          </Text>
        ))}
      </View>

      <View className="gap-1.5">
        {weekSegments.map((segments, weekIndex) => (
          <View key={weekIndex} className="flex-row items-center" style={{ height: RING_SIZE }}>
            {segments.map((segment, segmentIndex) => {
              if (segment.type === "blank") return <View key={segmentIndex} style={{ flex: 1 }} />;

              if (segment.type === "pill") {
                return (
                  <View
                    key={segmentIndex}
                    style={{ flex: segment.dates.length, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: colors.semantic.success }}
                    className="mx-0.5 flex-row items-center"
                  >
                    {segment.dates.map((date) => (
                      <View key={toDateKey(date)} style={{ flex: 1 }} className="items-center">
                        <Text className="body-sm font-body-bold" style={{ color: colors.brand.iron }}>
                          {date.getDate()}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }

              const isFuture = segment.date > today;
              const ratio = isFuture ? 0 : dayHealthinessRatio(totalsByDay.get(toDateKey(segment.date)) ?? EMPTY_MACROS, targets);
              const isToday = toDateKey(segment.date) === toDateKey(today);
              return (
                <View key={segmentIndex} style={{ flex: 1 }} className="items-center">
                  <GoalRing ratio={ratio} color={colors.semantic.success} size={RING_SIZE} strokeWidth={3}>
                    <Text className="caption font-body-semibold" style={{ color: isToday ? colors.brand.yellow : colors.neutral.textPrimary }}>
                      {segment.date.getDate()}
                    </Text>
                  </GoalRing>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
