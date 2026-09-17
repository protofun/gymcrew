import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { ElasticSlider } from "@/components/ui/micro-interactions/elastic-slider";
import { colors, radius } from "@/theme";

type SliderFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  rightAdornment?: ReactNode;
};

/**
 * Built on Reacticx's `ElasticSlider` (Root/Track/Fill) instead of the old `@react-native-community/
 * slider`-backed `Slider` component — a real upgrade in feel (an elastic overshoot at the track
 * ends). `ElasticSlider.Value` isn't used for the number display since it internally rounds to a
 * whole number before formatting (`Math.round(value.value)`), which breaks the decimal precision
 * some fields need (e.g. height in inches); the value stays a plain `Text` bound to the same
 * controlled `value` this component already receives, same pattern as `RulerStepper`. Dropped: the
 * old tap-to-type override for exact entry — `ElasticSlider` is drag-only, matching "use the
 * primitive as documented" over preserving every input path.
 */
export function SliderField({ label, value, onChange, min, max, step = 1, decimals = 0, rightAdornment }: SliderFieldProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="body-md text-text-primary">{label}</Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="heading-4 text-2xl text-brand-yellow">{value.toFixed(decimals)}</Text>
          {rightAdornment}
        </View>
      </View>

      <ElasticSlider.Root value={value} min={min} max={max} step={step} isStepped onValueChange={onChange}>
        <ElasticSlider.Track color={colors.neutral.divider} style={{ height: 8, borderRadius: radius.pill }}>
          <ElasticSlider.Fill color={colors.brand.yellow} />
        </ElasticSlider.Track>
      </ElasticSlider.Root>

      <View className="flex-row justify-between">
        <Text className="caption text-text-secondary">{min}</Text>
        <Text className="caption text-text-secondary">{max}</Text>
      </View>
    </View>
  );
}
