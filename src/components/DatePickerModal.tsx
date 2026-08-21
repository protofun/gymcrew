import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMonthGrid, startOfMonth, toDateKey } from "@/lib/date";
import { colors } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DatePickerModalProps = {
  visible: boolean;
  title?: string;
  minDate: Date;
  maxDate: Date;
  selectedDate?: Date | null;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

export function DatePickerModal({ visible, title = "Pick a date", minDate, maxDate, selectedDate, onClose, onSelect }: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate ?? minDate));

  const weeks = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const minKey = toDateKey(minDate);
  const maxKey = toDateKey(maxDate);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const canGoPrev = startOfMonth(visibleMonth) > startOfMonth(minDate);
  const canGoNext = startOfMonth(visibleMonth) < startOfMonth(maxDate);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{ paddingBottom: insets.bottom + 16, backgroundColor: colors.neutral.background }}
            className="gap-3 rounded-t-3xl border border-divider p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="heading-4 text-text-primary">{title}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => canGoPrev && setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                disabled={!canGoPrev}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.neutral.textSecondary : colors.neutral.divider} />
              </Pressable>
              <Text className="body-md text-text-primary">
                {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                onPress={() => canGoNext && setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                disabled={!canGoNext}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.neutral.textSecondary : colors.neutral.divider} />
              </Pressable>
            </View>

            <View className="flex-row justify-between">
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} className="caption w-9 text-center text-text-secondary">
                  {label}
                </Text>
              ))}
            </View>

            <View className="gap-1">
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {week.map((date, dayIndex) => {
                    if (!date) return <View key={dayIndex} className="h-9 w-9" />;
                    const key = toDateKey(date);
                    const inRange = key >= minKey && key <= maxKey;
                    const isSelected = key === selectedKey;
                    return (
                      <Pressable key={dayIndex} disabled={!inRange} onPress={() => onSelect(date)} className="h-9 w-9 items-center justify-center">
                        <View className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-brand-yellow" : ""}`}>
                          <Text
                            className={`body-sm ${
                              !inRange ? "text-text-secondary opacity-30" : isSelected ? "font-body-semibold text-brand-iron" : "text-text-primary"
                            }`}
                          >
                            {date.getDate()}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
