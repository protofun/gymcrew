import { Text, View } from "react-native";

import { AmountRuler } from "@/components/AmountRuler";
import { FieldLabel } from "@/components/OnboardingScreen";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

type GoalTargetRulerProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (value: number) => void;
  /** Change it to move the ruler to `value` from outside (a preset, another unit). */
  resetKey: number;
};

/** A number you set by dragging: the value as big rolling digits right above the ruler (Reacticx `number-flow` and `ruler`), so what
 * you're setting and the thing you're dragging are one unit — and the ruler stays at the bottom. */
export function GoalTargetRuler({ label, value, unit, min, max, step, color, onChange, resetKey }: GoalTargetRulerProps) {
  return (
    <View className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <View className="flex-row items-baseline justify-center gap-2">
        <NumberFlow value={value} decimals={step < 1 ? 1 : 0} fontSize={48} color={color} fontWeight="800" />
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.neutral.textSecondary }}>{unit}</Text>
      </View>
      <AmountRuler value={value} min={min} max={max} unitStep={step} onChange={onChange} resetKey={resetKey} />
    </View>
  );
}
