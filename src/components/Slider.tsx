import CommunitySlider from "@react-native-community/slider";

import { colors } from "@/theme";

const THUMB_SIZE = 22;

type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
};

export function Slider({ value, onValueChange, minimumValue, maximumValue, step = 1 }: SliderProps) {
  return (
    <CommunitySlider
      value={value}
      onValueChange={onValueChange}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      minimumTrackTintColor={colors.brand.yellow}
      maximumTrackTintColor={colors.neutral.divider}
      thumbTintColor={colors.brand.yellow}
      style={{ height: THUMB_SIZE + 12 }}
    />
  );
}
