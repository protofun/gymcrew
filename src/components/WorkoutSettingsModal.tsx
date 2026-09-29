import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { PillRow } from "@/components/PillRow";
import { ToggleRow } from "@/components/ToggleRow";
import type { WeightUnit } from "@/store/active-workout-store";
import { colors, fontFamily } from "@/theme";

const REST_DURATION_PRESETS = [0, 30, 60, 90, 120, 180];
const UNIT_OPTIONS = [
  { key: "kg", label: "KG" },
  { key: "lbs", label: "LBS" },
] as const;

function formatRestDuration(seconds: number): string {
  if (seconds === 0) return "Off";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

const REST_OPTIONS = REST_DURATION_PRESETS.map((seconds) => ({ key: String(seconds), label: formatRestDuration(seconds) }));

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

/** The gear-icon screen — a real Reacticx `BottomSheet` now (drag-to-dismiss, the same shell every
 * other settings sheet in the app uses) instead of a plain centered `Modal`, `PillRow` for weight
 * unit and rest-timer presets instead of hand-rolled bordered pills, and `ToggleRow` (the
 * spring-animated whole-row switch from the onboarding kit, reused everywhere a plain `Switch` used
 * to be) for auto-fill — matching the pass Crew's own settings screen already went through. */
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
    <BottomSheet visible={visible} onClose={onClose} maxDynamicContentSize={560}>
      <View className="gap-5 px-5 pb-6 pt-1">
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.5, color: colors.brand.white }}>WORKOUT SETTINGS</Text>
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
          <PillRow options={UNIT_OPTIONS} value={unit} onChange={(value) => onChangeUnit(value as WeightUnit)} wrap />
        </View>

        <View className="gap-1.5">
          <Text className="body-sm text-text-secondary">Rest Timer</Text>
          <PillRow options={REST_OPTIONS} value={String(restDurationSeconds)} onChange={(value) => onChangeRestDurationSeconds(Number(value))} wrap />
        </View>

        <ToggleRow title="Auto-fill Sets" subtitle="New sets start with the weight & reps from the set above" value={autoFillPreviousSet} onValueChange={onChangeAutoFillPreviousSet} />

        <Pressable onPress={onDiscard} className="flex-row items-center justify-center gap-2 rounded-full border border-error py-3">
          <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
          <Text className="body-md font-body-semibold text-error">Discard Workout</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
