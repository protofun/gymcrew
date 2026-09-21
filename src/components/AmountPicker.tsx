import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AmountRuler } from "@/components/AmountRuler";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

type AmountPickerProps = {
  value: number;
  unit: string;
  min: number;
  max: number;
  /** What one tick of the ruler is worth. */
  step: number;
  onChange: (value: number) => void;
  /** Quick values shown as chips under the ruler — tapping one moves the ruler there. */
  presets?: { label: string; value: number }[];
  /** Change it to move the ruler to `value` from outside (e.g. after switching the unit). */
  resetToken?: number;
};

/** Picks an amount: the number rolls big in the middle, a ruler underneath is dragged to change it, and
 * chips jump to common amounts. Used for grams/pieces on a food, and for calories in Quick Add. */
export function AmountPicker({ value, unit, min, max, step, onChange, presets, resetToken = 0 }: AmountPickerProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <View className="gap-3">
      <View className="items-center">
        <View className="flex-row items-baseline gap-2">
          <NumberFlow value={value} fontSize={60} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 1, color: colors.neutral.textSecondary }}>{unit.toUpperCase()}</Text>
        </View>
      </View>

      <AmountRuler value={value} min={min} max={max} unitStep={step} onChange={onChange} resetKey={resetKey + resetToken} />

      {presets && presets.length > 0 && (
        <View className="flex-row flex-wrap justify-center gap-2">
          {presets.map((preset) => {
            const selected = preset.value === value;
            return (
              <Pressable
                key={preset.label}
                onPress={() => {
                  onChange(preset.value);
                  setResetKey((key) => key + 1);
                }}
                style={{ backgroundColor: selected ? colors.brand.yellow : colors.neutral.surface, borderColor: selected ? colors.brand.yellow : colors.neutral.divider }}
                className="rounded-full border px-3.5 py-2"
              >
                <Text className="caption font-body-bold" style={{ color: selected ? colors.brand.iron : colors.brand.white }}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
