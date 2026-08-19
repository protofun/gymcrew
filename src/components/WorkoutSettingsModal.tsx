import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import type { WeightUnit } from "@/store/active-workout-store";
import { colors } from "@/theme";

const REST_DURATION_PRESETS = [0, 30, 60, 90, 120, 180];

function formatRestDuration(seconds: number): string {
  if (seconds === 0) return "Off";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

type WorkoutSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  onChangeName: (name: string) => void;
  unit: WeightUnit;
  onChangeUnit: (unit: WeightUnit) => void;
  restDurationSeconds: number;
  onChangeRestDurationSeconds: (seconds: number) => void;
  autoFillPreviousSet: boolean;
  onChangeAutoFillPreviousSet: (enabled: boolean) => void;
  onDiscard: () => void;
};

export function WorkoutSettingsModal({
  visible,
  onClose,
  name,
  onChangeName,
  unit,
  onChangeUnit,
  restDurationSeconds,
  onChangeRestDurationSeconds,
  autoFillPreviousSet,
  onChangeAutoFillPreviousSet,
  onDiscard,
}: WorkoutSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
        >
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Workout Settings</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Workout Name</Text>
            <TextInput
              value={name}
              onChangeText={onChangeName}
              placeholder="Workout"
              placeholderTextColor={colors.neutral.textSecondary}
              className="body-md rounded-xl bg-background px-4 py-3 text-text-primary"
            />
          </View>

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Weight Unit</Text>
            <View className="flex-row gap-2">
              {(["kg", "lbs"] as WeightUnit[]).map((option) => {
                const selected = unit === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => onChangeUnit(option)}
                    className={`flex-1 items-center rounded-full border py-2.5 ${
                      selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-background"
                    }`}
                  >
                    <Text className={`body-md font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>
                      {option.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Rest Timer</Text>
            <View className="flex-row flex-wrap gap-2">
              {REST_DURATION_PRESETS.map((seconds) => {
                const selected = restDurationSeconds === seconds;
                return (
                  <Pressable
                    key={seconds}
                    onPress={() => onChangeRestDurationSeconds(seconds)}
                    className={`items-center rounded-full border px-4 py-2.5 ${
                      selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-background"
                    }`}
                  >
                    <Text className={`body-sm font-body-semibold ${selected ? "text-brand-iron" : "text-text-secondary"}`}>
                      {formatRestDuration(seconds)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row items-center justify-between rounded-xl bg-background px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="body-md text-text-primary">Auto-fill Sets</Text>
              <Text className="body-sm text-text-secondary">New sets start with the weight & reps from the set above</Text>
            </View>
            <Switch
              value={autoFillPreviousSet}
              onValueChange={onChangeAutoFillPreviousSet}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>

          <View className="h-px bg-divider" />

          <Pressable
            onPress={onDiscard}
            className="flex-row items-center justify-center gap-2 rounded-full border border-error py-3"
          >
            <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
            <Text className="body-md font-body-semibold text-error">Discard Workout</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
