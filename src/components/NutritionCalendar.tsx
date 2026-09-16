import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

import { GoalRing } from "@/components/GoalRing";
import type { ApiFoodLog } from "@/lib/api";
import { fromDateKey, getMonthGrid, isSameMonth, toDateKey } from "@/lib/date";
import { dayGoalStatus, dayHealthinessRatio } from "@/lib/nutrition-day-status";
import { sumMacros, type Macros } from "@/lib/nutrition-macros";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const RING_SIZE = 32;
const PILL_RADIUS = RING_SIZE / 2;
const EMPTY_MACROS: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

type DaySegment = { type: "pill"; dates: Date[] } | { type: "ring"; date: Date } | { type: "blank" };

/** Where a date falls within its (possibly joined) segment — drives which corners of its calendar
 * cell get rounded so consecutive "pill" cells read as one continuous bar. */
type CellRole = "ring" | "pillSingle" | "pillStart" | "pillMiddle" | "pillEnd";

// Replaces the Calendar's own title/arrows header — we render our own above it, unchanged from
// before, so the layout order (title + arrows, then weekday labels, then the day grid) stays the same.
function NullHeader() {
  return null;
}

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

  const cellRoleByDay = useMemo(() => {
    const map = new Map<string, CellRole>();
    for (const segments of weekSegments) {
      for (const segment of segments) {
        if (segment.type === "ring") {
          map.set(toDateKey(segment.date), "ring");
        } else if (segment.type === "pill") {
          const lastIndex = segment.dates.length - 1;
          segment.dates.forEach((date, index) => {
            const role: CellRole =
              segment.dates.length === 1 ? "pillSingle" : index === 0 ? "pillStart" : index === lastIndex ? "pillEnd" : "pillMiddle";
            map.set(toDateKey(date), role);
          });
        }
      }
    }
    return map;
  }, [weekSegments]);

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

  function renderDay({ date }: { date?: DateData }) {
    if (!date) return null;
    const dateKey = date.dateString;
    const role = cellRoleByDay.get(dateKey);
    if (!role) return null;

    if (role === "ring") {
      const asDate = fromDateKey(dateKey);
      const isFuture = asDate > today;
      const ratio = isFuture ? 0 : dayHealthinessRatio(totalsByDay.get(dateKey) ?? EMPTY_MACROS, targets);
      const isToday = dateKey === toDateKey(today);
      return (
        <View style={{ height: RING_SIZE }} className="w-full items-center justify-center">
          <GoalRing ratio={ratio} color={colors.semantic.success} size={RING_SIZE} strokeWidth={3}>
            <Text className="caption font-body-semibold" style={{ color: isToday ? colors.brand.yellow : colors.neutral.textPrimary }}>
              {date.day}
            </Text>
          </GoalRing>
        </View>
      );
    }

    const roundLeft = role === "pillSingle" || role === "pillStart";
    const roundRight = role === "pillSingle" || role === "pillEnd";
    return (
      <View
        style={{
          height: RING_SIZE,
          backgroundColor: colors.semantic.success,
          borderTopLeftRadius: roundLeft ? PILL_RADIUS : 0,
          borderBottomLeftRadius: roundLeft ? PILL_RADIUS : 0,
          borderTopRightRadius: roundRight ? PILL_RADIUS : 0,
          borderBottomRightRadius: roundRight ? PILL_RADIUS : 0,
        }}
        className="w-full items-center justify-center"
      >
        <Text className="body-sm font-body-bold" style={{ color: colors.brand.iron }}>
          {date.day}
        </Text>
      </View>
    );
  }

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

      <Calendar
        initialDate={toDateKey(visibleMonth)}
        firstDay={1}
        hideExtraDays
        customHeader={NullHeader}
        dayComponent={renderDay}
        style={{ paddingLeft: 0, paddingRight: 0 }}
        theme={{ calendarBackground: "transparent", weekVerticalMargin: 3 }}
      />
    </View>
  );
}
