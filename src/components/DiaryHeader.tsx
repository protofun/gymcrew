import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { DiaryWeekStrip, shiftWeek } from "@/components/DiaryWeekStrip";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { addDays, formatDiaryDate, getCurrentWeekDates, toDateKey } from "@/lib/date";
import { colors, fontFamily } from "@/theme";

/** Height of the title row when open and when collapsed. */
const ROW_OPEN = 46;
const ROW_COLLAPSED = 36;
/** Width of the week navigation, which folds to nothing when collapsed. */
const WEEK_NAV_WIDTH = 132;

type DiaryHeaderProps = {
  viewedDate: Date;
  today: Date;
  loggedDateKeys: Set<string>;
  /** 0 = fully open, 1 = collapsed — driven by how far the page below has scrolled. */
  collapse: SharedValue<number>;
  onSelectDate: (date: Date) => void;
  onOpenCalendar: () => void;
  onOpenTargets: () => void;
};

function RoundButton({ icon, onPress, label, active }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; active?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface" accessibilityLabel={label}>
      <Ionicons name={icon} size={17} color={active ? colors.brand.yellow : colors.neutral.textPrimary} />
    </Pressable>
  );
}

/** The diary's top. It stays put while the page scrolls, but shrinks: the big animated title turns into a
 * small one, the week navigation folds away and the week strip tightens to just the dates — so it never eats
 * the screen once you're reading the log. (The tab's own switch above it holds the way back to the rest of the app.) */
export function DiaryHeader({ viewedDate, today, loggedDateKeys, collapse, onSelectDate, onOpenCalendar, onOpenTargets }: DiaryHeaderProps) {
  const week = getCurrentWeekDates(viewedDate);
  const nextWeekStartsAfterToday = toDateKey(addDays(week[0], 7)) > toDateKey(today);
  const rangeLabel = `${week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en-US", { month: week[0].getMonth() === week[6].getMonth() ? undefined : "short", day: "numeric" })}`;
  const dayLabel = formatDiaryDate(viewedDate, today);

  const rowStyle = useAnimatedStyle(() => ({ height: interpolate(collapse.value, [0, 1], [ROW_OPEN, ROW_COLLAPSED], Extrapolation.CLAMP) }));
  const bigTitleStyle = useAnimatedStyle(() => ({ opacity: interpolate(collapse.value, [0, 0.5], [1, 0], Extrapolation.CLAMP) }));
  const smallTitleStyle = useAnimatedStyle(() => ({ opacity: interpolate(collapse.value, [0.5, 1], [0, 1], Extrapolation.CLAMP) }));
  const weekNavStyle = useAnimatedStyle(() => ({
    width: interpolate(collapse.value, [0, 1], [WEEK_NAV_WIDTH, 0], Extrapolation.CLAMP),
    opacity: interpolate(collapse.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: interpolate(collapse.value, [0.6, 1], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View className="px-4 pb-3 pt-1">
      <Animated.View style={rowStyle} className="flex-row items-center justify-between">
        <View className="flex-1 justify-center" style={{ height: "100%" }}>
          <Animated.View style={[{ position: "absolute" }, bigTitleStyle]}>
            <AnimatedText
              text={dayLabel.toUpperCase()}
              animationConfig={{ characterDelay: 30 }}
              enterFrom={{ translateY: 32, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 38, lineHeight: 42, letterSpacing: 1, color: colors.brand.white }}
            />
          </Animated.View>
          <Animated.Text style={[{ position: "absolute", fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 1, color: colors.brand.white }, smallTitleStyle]}>{dayLabel.toUpperCase()}</Animated.Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Animated.View style={[{ overflow: "hidden" }, weekNavStyle]}>
            <View className="flex-row items-center justify-end gap-1" style={{ width: WEEK_NAV_WIDTH }}>
              <Pressable onPress={() => onSelectDate(shiftWeek(viewedDate, today, -1))} hitSlop={10} className="p-1" accessibilityLabel="Previous week">
                <Ionicons name="chevron-back" size={15} color={colors.neutral.textSecondary} />
              </Pressable>
              <Text className="caption font-body-semibold text-text-secondary">{rangeLabel}</Text>
              <Pressable onPress={() => onSelectDate(shiftWeek(viewedDate, today, 1))} disabled={nextWeekStartsAfterToday} hitSlop={10} className="p-1" accessibilityLabel="Next week">
                <Ionicons name="chevron-forward" size={15} color={nextWeekStartsAfterToday ? colors.neutral.divider : colors.neutral.textSecondary} />
              </Pressable>
            </View>
          </Animated.View>
          <RoundButton icon="calendar-outline" onPress={onOpenCalendar} label="Pick a date" active />
          <RoundButton icon="options-outline" onPress={onOpenTargets} label="Nutrition targets" />
        </View>
      </Animated.View>

      <View className="pt-2.5">
        <DiaryWeekStrip viewedDate={viewedDate} today={today} loggedDateKeys={loggedDateKeys} collapse={collapse} onSelectDate={onSelectDate} />
      </View>

      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: colors.neutral.divider }, dividerStyle]} />
    </View>
  );
}
