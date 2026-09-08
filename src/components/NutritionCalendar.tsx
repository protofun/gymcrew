import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { getMonthGrid, isSameMonth, toDateKey } from "@/lib/date";
import type { ApiFoodLog } from "@/lib/api";
import { type DayGoalStatus, dayGoalStatus } from "@/lib/nutrition-day-status";
import { sumMacros, type Macros } from "@/lib/nutrition-macros";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_SIZE = 32;

const STATUS_COLOR: Record<DayGoalStatus, string | null> = {
  hit: colors.semantic.success,
  missed: colors.semantic.warning,
  "no-data": null,
};

function DayCell({ date, status, isToday }: { date: Date; status: DayGoalStatus; isToday: boolean }) {
  const fillColor = STATUS_COLOR[status];
  return (
    <View className="flex-1 items-center py-1">
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: DAY_SIZE,
          height: DAY_SIZE,
          backgroundColor: fillColor ?? "transparent",
          borderWidth: fillColor ? 0 : 1,
          borderColor: isToday ? colors.brand.yellow : colors.neutral.divider,
        }}
      >
        <Text className="body-sm" style={{ color: fillColor ? colors.brand.iron : isToday ? colors.brand.yellow : colors.neutral.textPrimary }}>
          {date.getDate()}
        </Text>
      </View>
    </View>
  );
}

/** Month calendar coloring every day by whether its logged nutrition hit target (green), missed it
 * (amber), or nothing was logged (empty outline) — see NUTRITION.md section 4's "overview which
 * days I did/didn't hit my goal". Same month-grid mechanics as workout/history.tsx's calendar, own
 * day-cell language since "trained or not" doesn't apply here — this is a three-state, not binary. */
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

  const monthStats = useMemo(() => {
    let hit = 0;
    let missed = 0;
    for (const week of weeks) {
      for (const date of week) {
        if (!date || date > today) continue;
        const totals = totalsByDay.get(toDateKey(date));
        const status = totals ? dayGoalStatus(totals, targets) : "no-data";
        if (status === "hit") hit++;
        else if (status === "missed") missed++;
      }
    }
    return { hit, missed };
  }, [weeks, totalsByDay, targets, today]);

  return (
    <View className="gap-3 rounded-3xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
        </Pressable>
        <Text className="body-md font-body-semibold text-text-primary">
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

      <View className="flex-row justify-between">
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} className="caption flex-1 text-center text-text-secondary">
            {label}
          </Text>
        ))}
      </View>

      <View className="gap-1">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row">
            {week.map((date, dayIndex) =>
              date ? (
                <DayCell
                  key={dayIndex}
                  date={date}
                  status={date > today ? "no-data" : dayGoalStatus(totalsByDay.get(toDateKey(date)) ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }, targets)}
                  isToday={toDateKey(date) === toDateKey(today)}
                />
              ) : (
                <View key={dayIndex} className="flex-1" />
              ),
            )}
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-center gap-4 pt-1">
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.semantic.success }} />
          <Text className="caption text-text-secondary">{`${monthStats.hit} on target`}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.semantic.warning }} />
          <Text className="caption text-text-secondary">{`${monthStats.missed} off target`}</Text>
        </View>
      </View>
    </View>
  );
}
