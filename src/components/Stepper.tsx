import { useEffect, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { useEditableNumber } from "@/hooks/use-editable-number";

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  rightAdornment?: ReactNode;
};

export function Stepper({ label, value, onChange, step, min, max, decimals = 0, rightAdornment }: StepperProps) {
  const scale = useSharedValue(1);
  const { editing, draft, setDraft, startEditing, commitEdit, clamp } = useEditableNumber({
    value,
    onChange,
    min,
    max,
    decimals,
  });

  useEffect(() => {
    if (!editing) {
      scale.value = withSequence(withTiming(1.18, { duration: 90 }), withTiming(1, { duration: 140 }));
    }
  }, [value, scale, editing]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="gap-2">
      <Text className="body-md text-text-primary">{label}</Text>
      <View className="flex-row items-center justify-between rounded-xl border border-divider bg-surface px-3 py-3">
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          className="h-11 w-11 items-center justify-center rounded-lg bg-divider"
        >
          <Text className="heading-4 text-text-primary">−</Text>
        </Pressable>

        <View className="flex-row items-baseline gap-2">
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              className="heading-4 min-w-[56px] text-2xl text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent", textAlign: "center" }}
            />
          ) : (
            <Pressable onPress={startEditing}>
              <Animated.Text style={numberStyle} className="heading-4 text-2xl text-text-primary">
                {value.toFixed(decimals)}
              </Animated.Text>
            </Pressable>
          )}
          {rightAdornment}
        </View>

        <Pressable
          onPress={() => onChange(clamp(value + step))}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          className="h-11 w-11 items-center justify-center rounded-lg bg-divider"
        >
          <Text className="heading-4 text-text-primary">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
