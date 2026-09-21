import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { addDays, getCurrentWeekDates, toDateKey } from "@/lib/date";
import { colors, fontFamily } from "@/theme";

type DiaryWeekStripProps = {
  viewedDate: Date;
  today: Date;
  /** Days that have something logged — they get a dot. */
  loggedDateKeys: Set<string>;
  /** 0 = full cells, 1 = compact (just the date number) — the weekday letter and the dot fold away. */
  collapse: SharedValue<number>;
  onSelectDate: (date: Date) => void;
};

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** One day of the strip — its weekday letter and logged-dot shrink to nothing as `collapse` goes to 1. */
function DayCell({ letter, day, selected, future, logged, collapse }: { letter: string; day: number; selected: boolean; future: boolean; logged: boolean; collapse: SharedValue<number> }) {
  const letterStyle = useAnimatedStyle(() => ({ height: 13 * (1 - collapse.value), opacity: 1 - collapse.value }));
  const dotStyle = useAnimatedStyle(() => ({ height: 6 * (1 - collapse.value), opacity: 1 - collapse.value }));

  return (
    <View className="items-center" style={{ opacity: future ? 0.35 : 1 }}>
      <Animated.View style={[{ overflow: "hidden" }, letterStyle]}>
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>{letter}</Text>
      </Animated.View>
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, color: selected ? colors.brand.iron : colors.brand.white }}>{day}</Text>
      <Animated.View style={[{ overflow: "hidden" }, dotStyle]}>
        <View style={{ width: 5, height: 5, marginTop: 1, borderRadius: 3, backgroundColor: logged ? (selected ? colors.brand.iron : colors.brand.yellow) : "transparent" }} />
      </Animated.View>
    </View>
  );
}

/** The week as one sliding control (Reacticx `segmented-control`): tap a day, or drag across the strip to
 * scrub through the week. Days with food in the log carry a dot; days still to come are dimmed and
 * can't be picked. */
export function DiaryWeekStrip({ viewedDate, today, loggedDateKeys, collapse, onSelectDate }: DiaryWeekStripProps) {
  const [width, setWidth] = useState(0);
  const weekDates = getCurrentWeekDates(viewedDate);
  const viewedKey = toDateKey(viewedDate);
  const todayKey = toDateKey(today);
  const currentIndex = weekDates.findIndex((date) => toDateKey(date) === viewedKey);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <SegmentedControl
          currentIndex={currentIndex}
          onChange={(index) => {
            const date = weekDates[index];
            if (toDateKey(date) <= todayKey) onSelectDate(date);
          }}
          width={width}
          borderRadius={22}
          paddingVertical={9}
          segmentedControlBackgroundColor={colors.neutral.surface}
          activeSegmentBackgroundColor={colors.brand.yellow}
          dividerColor="transparent"
          disableScaleEffect
        >
          {weekDates.map((date, index) => {
            const key = toDateKey(date);
            const selected = key === viewedKey;
            const future = key > todayKey;
            return (
              <DayCell key={key} letter={WEEKDAY_LETTERS[index]} day={date.getDate()} selected={selected} future={future} logged={loggedDateKeys.has(key)} collapse={collapse} />
            );
          })}
        </SegmentedControl>
      )}
    </View>
  );
}

/** Which day to show when jumping a week back or forward — the same weekday, never past today. */
export function shiftWeek(viewedDate: Date, today: Date, weeks: number): Date {
  const shifted = addDays(viewedDate, weeks * 7);
  return toDateKey(shifted) > toDateKey(today) ? today : shifted;
}
