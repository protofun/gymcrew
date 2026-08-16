import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { WorkoutSummaryModal } from "@/components/WorkoutSummaryModal";
import type { WorkoutSession } from "@/data/workout-log";
import { toDateKey } from "@/lib/date";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthGrid(monthDate: Date): (Date | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // week starts Monday

  const cells: (Date | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function DayCell({
  date,
  isTrained,
  isToday,
  onPress,
}: {
  date: Date;
  isTrained: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-1 items-center py-1" onPress={onPress} disabled={!isTrained} hitSlop={2}>
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          isTrained ? "bg-brand-yellow" : isToday ? "border border-brand-yellow" : ""
        }`}
      >
        <Text
          className={`body-sm ${
            isTrained ? "font-body-semibold text-brand-iron" : isToday ? "text-brand-yellow" : "text-text-primary"
          }`}
        >
          {date.getDate()}
        </Text>
      </View>
    </Pressable>
  );
}

function LegendItem({ label, isTrained }: { label: string; isTrained: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2.5 w-2.5 rounded-full ${isTrained ? "bg-brand-yellow" : "border border-divider"}`} />
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

type TrainingCalendarProps = {
  sessions: Record<string, WorkoutSession>;
};

export function TrainingCalendar({ sessions }: TrainingCalendarProps) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weeks = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const isCurrentMonth = isSameMonth(visibleMonth, today);

  const trainedCountThisView = useMemo(
    () => weeks.flat().filter((date) => date && sessions[toDateKey(date)]).length,
    [weeks, sessions],
  );

  const goToPrevMonth = () => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const selectedSession = selectedDate ? (sessions[toDateKey(selectedDate)] ?? null) : null;

  return (
    <View className="mx-4 mt-8 gap-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="heading-4 text-text-primary">Training Calendar</Text>
          <Text className="caption text-text-secondary">{trainedCountThisView} sessions this month</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable onPress={goToPrevMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
          </Pressable>
          <Text className="body-md w-24 text-center text-text-primary">
            {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={goToNextMonth} hitSlop={8} disabled={isCurrentMonth}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <View className="gap-3 rounded-3xl border border-divider bg-surface p-4">
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
                    isTrained={Boolean(sessions[toDateKey(date)])}
                    isToday={toDateKey(date) === toDateKey(today)}
                    onPress={() => setSelectedDate(date)}
                  />
                ) : (
                  <View key={dayIndex} className="flex-1" />
                ),
              )}
            </View>
          ))}
        </View>

        <View className="flex-row gap-4 pt-1">
          <LegendItem label="Trained" isTrained />
          <LegendItem label="Rest day" isTrained={false} />
        </View>
      </View>

      <WorkoutSummaryModal
        visible={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate}
        session={selectedSession}
      />
    </View>
  );
}
