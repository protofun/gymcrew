import { Text, View } from "react-native";
import { useState } from "react";

import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { colors } from "@/theme";

type CrewSwitcherProps<T extends string> = {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
};

/** Real Reacticx `segmented-control` for a small, fixed set of equal-width options — Rivals' range
 * and metric switchers, Stats' range switcher, the same measure-width-then-render pattern as
 * `ChallengesTab`'s own `ScopeSwitcher` and `crew/leaderboard.tsx`'s (each kept local there since
 * their labels/behavior differ enough not to share one generic component; this one is deliberately
 * generic since Rivals and Stats both just need "N plain text options, one active"). */
export function CrewSwitcher<T extends string>({ options, labels, value, onChange }: CrewSwitcherProps<T>) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <SegmentedControl
          currentIndex={options.indexOf(value)}
          onChange={(index) => onChange(options[index])}
          width={width}
          borderRadius={22}
          paddingVertical={9}
          segmentedControlBackgroundColor={colors.neutral.surface}
          activeSegmentBackgroundColor={colors.brand.yellow}
          dividerColor="transparent"
          disableScaleEffect
        >
          {options.map((option) => (
            <Text key={option} className={`caption font-body-semibold ${option === value ? "text-brand-iron" : "text-text-secondary"}`}>
              {labels[option]}
            </Text>
          ))}
        </SegmentedControl>
      )}
    </View>
  );
}
