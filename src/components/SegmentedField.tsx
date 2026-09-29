import { useState } from "react";
import { Text, View } from "react-native";

import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { colors, fontFamily } from "@/theme";

type SegmentedFieldProps<T extends string> = {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** The control's fixed width — leave out to fill the row. */
  width?: number;
  paddingVertical?: number;
};

/** A sliding pill switch between a few options (Reacticx `segmented-control`), sized to the space it's given. */
export function SegmentedField<T extends string>({ options, value, onChange, width, paddingVertical = 13 }: SegmentedFieldProps<T>) {
  const [measured, setMeasured] = useState(0);
  const controlWidth = width ?? measured;

  return (
    <View style={width ? { width } : undefined} onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}>
      {controlWidth > 0 && (
        <SegmentedControl
          currentIndex={Math.max(0, options.findIndex((option) => option.key === value))}
          onChange={(index) => onChange(options[index].key)}
          width={controlWidth}
          borderRadius={24}
          paddingVertical={paddingVertical}
          segmentedControlBackgroundColor={colors.neutral.surface}
          activeSegmentBackgroundColor={colors.brand.yellow}
          dividerColor="transparent"
          disableScaleEffect
        >
          {options.map((option) => (
            <Text key={option.key} style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: option.key === value ? colors.brand.iron : colors.neutral.textSecondary }}>
              {option.label}
            </Text>
          ))}
        </SegmentedControl>
      )}
    </View>
  );
}
