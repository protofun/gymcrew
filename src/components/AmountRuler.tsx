import { useState } from "react";
import { View } from "react-native";

import { Ruler } from "@/components/ui/base/ruler";
import { colors } from "@/theme";

export type AmountRulerProps = {
  value: number;
  min: number;
  max: number;
  /** How much one tick of the ruler is worth (5 for grams, 1 for pieces, ...). */
  unitStep: number;
  onChange: (value: number) => void;
  /** Change it to move the ruler to `value` from outside (a preset chip) — the ruler itself is drag-only. */
  resetKey: number;
};

const TICK_SPACING = 12;

/** A ruler you drag left and right to pick an amount (Reacticx `ruler`, a Skia canvas — native only; the
 * web build uses AmountRuler.web.tsx). It's uncontrolled, so it starts on `value` and only reports what
 * you drag it to; `resetKey` remounts it when the amount is set some other way. */
export function AmountRuler({ value, min, max, unitStep, onChange, resetKey }: AmountRulerProps) {
  const [width, setWidth] = useState(0);
  const ticks = Math.max(1, Math.round((max - min) / unitStep));

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: 64 }}>
      {width > 0 && (
        <Ruler
          key={resetKey}
          width={width}
          height={64}
          minValue={0}
          maxValue={ticks}
          step={TICK_SPACING}
          initialValue={Math.round((value - min) / unitStep)}
          animateOnMount={false}
          onValueChange={(tick) => onChange(Math.min(max, min + tick * unitStep))}
          tickColor="rgba(255,255,255,0.35)"
          activeTickColor={colors.brand.yellow}
          notchHeight={38}
          notchWidth={3}
          enableHaptics
        />
      )}
    </View>
  );
}
