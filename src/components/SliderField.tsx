import { useEffect, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { useEditableNumber } from "@/hooks/use-editable-number";
import { colors } from "@/theme";

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

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 0,
  rightAdornment,
}: SliderFieldProps) {
  const scale = useSharedValue(1);
  const { editing, draft, setDraft, startEditing, commitEdit } = useEditableNumber({
    value,
    onChange,
    min,
    max,
    decimals,
  });

  useEffect(() => {
    if (!editing) {
      scale.value = withSequence(withTiming(1.15, { duration: 90 }), withTiming(1, { duration: 140 }));
    }
  }, [value, scale, editing]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="body-md text-text-primary">{label}</Text>

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            className="heading-4 min-w-[64px] text-right text-2xl text-brand-yellow"
            style={{ outlineWidth: 0, outlineColor: "transparent" }}
          />
        ) : (
          <Pressable onPress={startEditing} className="flex-row items-baseline gap-1">
            <Animated.Text style={numberStyle} className="heading-4 text-2xl text-brand-yellow">
              {value.toFixed(decimals)}
            </Animated.Text>
            {rightAdornment}
          </Pressable>
        )}
      </View>

      <Slider
        value={value}
        onValueChange={onChange}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={colors.brand.yellow}
        maximumTrackTintColor={colors.neutral.divider}
        thumbTintColor={colors.brand.yellow}
      />

      <View className="flex-row justify-between">
        <Text className="caption text-text-secondary">{min}</Text>
        <Text className="caption text-text-secondary">{max}</Text>
      </View>
    </View>
  );
}
