import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import AnimatedText from "@/components/ui/organisms/animated-text";
import { getMonthGrid, isSameMonth, startOfMonth, toDateKey } from "@/lib/date";
import { dayGoalStatus, dayHealthinessRatio } from "@/lib/nutrition-day-status";
import type { Macros } from "@/lib/nutrition-macros";
import { colors, fontFamily } from "@/theme";

type HistoryCalendarProps = {
  totalsByDateKey: Map<string, Macros>;
  /** The daily targets, or `null` — without them a logged day is just "logged". */
  targets: Macros | null;
  onSelectDate: (date: Date) => void;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

/** A month of the food log as a grid of days. How yellow a day is says how close to target it was; a solid
 * yellow day hit its goal. Page through the months, and tap a day to open it in the diary. */
export function HistoryCalendar({ totalsByDateKey, targets, onSelectDate }: HistoryCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [month, setMonth] = useState(startOfMonth(today));
  const weeks = useMemo(() => getMonthGrid(month), [month]);
  const isCurrentMonth = isSameMonth(month, today);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  function shiftMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <AnimatedText
          key={monthLabel}
          text={monthLabel}
          animationConfig={{ characterDelay: 22 }}
          enterFrom={{ translateY: 24, scale: 0.4 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1, color: colors.brand.white }}
        />
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={16} color={colors.neutral.textPrimary} />
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} disabled={isCurrentMonth} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={16} color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View>
        <View className="mb-1.5 flex-row">
          {WEEKDAYS.map((letter, index) => (
            <View key={index} className="flex-1 items-center">
              <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.neutral.textSecondary }}>{letter}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={`${monthLabel}-${weekIndex}`} className="flex-row">
            {week.map((date, dayIndex) => {
              if (!date) return <View key={dayIndex} style={{ flex: 1, aspectRatio: 1 }} />;
              const key = toDateKey(date);
              const totals = totalsByDateKey.get(key);
              const logged = !!totals && totals.calories > 0;
              const future = key > todayKey;
              const hit = logged && targets !== null && dayGoalStatus(totals, targets) === "hit";
              const ratio = logged && targets ? dayHealthinessRatio(totals, targets) : logged ? 0.35 : 0;
              const background = future ? "transparent" : hit ? colors.brand.yellow : logged ? `rgba(227,255,0,${0.14 + ratio * 0.5})` : colors.neutral.surface;
              return (
                <View key={key} style={{ flex: 1, aspectRatio: 1, padding: 3 }}>
                  <Animated.View entering={FadeIn.delay((weekIndex * 7 + dayIndex) * 14).duration(280)} style={{ flex: 1 }}>
                    <Pressable
                      onPress={() => onSelectDate(date)}
                      disabled={future}
                      style={{ flex: 1, borderRadius: 11, backgroundColor: background, alignItems: "center", justifyContent: "center", borderWidth: key === todayKey ? 2 : 0, borderColor: colors.brand.white, opacity: future ? 0.35 : 1 }}
                      accessibilityLabel={`Open ${date.toDateString()} in the diary`}
                    >
                      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: hit ? colors.brand.iron : colors.brand.white }}>{date.getDate()}</Text>
                    </Pressable>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
        {targets && <Legend color={colors.brand.yellow} label="On target" />}
        <Legend color="rgba(227,255,0,0.4)" label="Logged" />
        <Legend color={colors.neutral.surface} label="Nothing" />
        <Text className="caption text-text-secondary">· tap a day to open it</Text>
      </View>
    </View>
  );
}
