import { Pressable, ScrollView, Text, View } from "react-native";

import type { ConsistencyCell } from "@/lib/training-consistency";
import { colors, fontFamily } from "@/theme";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CELL_SIZE = 11;
const CELL_GAP = 3;
const ROW_HEIGHT = CELL_SIZE + CELL_GAP;
const LABEL_COLUMN_WIDTH = 16;
const MONTH_ROW_HEIGHT = 16;

function levelColor(level: ConsistencyCell["level"]): string {
  if (level === 2) return colors.brand.yellow;
  if (level === 1) return `${colors.brand.yellow}55`;
  return colors.neutral.divider;
}

/** One year of `buildConsistencyYear`'s Monday-start weeks as a GitHub-contribution-style grid — a
 * fixed cell size in a horizontal scroll, not squeezed to fit the screen width, so the ~53 columns a
 * year needs stay legible and tappable instead of shrinking into an illegible smear. The weekday
 * column stays put outside that scroll, same "frozen header" idea `WorkoutStatsTabs`' own chart
 * scroller uses. */
export function TrainingConsistencyGrid({ year, weeks, onPressDay }: { year: number; weeks: (ConsistencyCell | null)[][]; onPressDay?: (cell: ConsistencyCell) => void }) {
  const monthMarkers: { index: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const firstCell = week.find((cell): cell is ConsistencyCell => cell !== null);
    if (!firstCell) return;
    const month = firstCell.date.getMonth();
    if (month !== lastMonth) {
      monthMarkers.push({ index, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  return (
    <View className="gap-2">
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 1, color: colors.brand.white }}>{year}</Text>
      <View className="flex-row">
        <View style={{ width: LABEL_COLUMN_WIDTH, marginTop: MONTH_ROW_HEIGHT }}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={index} style={{ height: ROW_HEIGHT, justifyContent: "center" }}>
              {index % 2 === 0 && <Text style={{ fontSize: 9, fontFamily: fontFamily.bodySemiBold, color: colors.neutral.textSecondary }}>{label}</Text>}
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ height: MONTH_ROW_HEIGHT }}>
              {monthMarkers.map(({ index, label }) => (
                <Text
                  key={index}
                  style={{ position: "absolute", left: index * (CELL_SIZE + CELL_GAP), fontSize: 10, fontFamily: fontFamily.bodySemiBold, color: colors.neutral.textSecondary }}
                >
                  {label}
                </Text>
              ))}
            </View>
            <View className="flex-row" style={{ gap: CELL_GAP }}>
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={{ gap: CELL_GAP }}>
                  {week.map((cell, dayIndex) =>
                    cell ? (
                      <Pressable
                        key={dayIndex}
                        disabled={!onPressDay}
                        onPress={() => onPressDay?.(cell)}
                        style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2.5, backgroundColor: levelColor(cell.level) }}
                      />
                    ) : (
                      <View key={dayIndex} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
