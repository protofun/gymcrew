import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import type { Exercise } from "@/data/exercises";
import { addTestWeighIn, setTestPersonalRecord } from "@/lib/dev-tools";
import { goBack } from "@/lib/navigation";
import { showToast } from "@/lib/toast";
import { DEVELOPER_MODE_EMAILS } from "@/store/developer-mode-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors } from "@/theme";

function NumberField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <Text className="caption font-body-semibold text-text-secondary">{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md rounded-2xl border border-divider bg-background px-4 py-3.5 text-text-primary"
        style={{ outlineWidth: 0, outlineColor: "transparent" }}
      />
    </View>
  );
}

function SaveButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.75 : 1 })}
      className="items-center rounded-full bg-brand-yellow py-3.5"
    >
      <Text className="body-md font-body-semibold text-brand-iron">{label}</Text>
    </Pressable>
  );
}

/** Accepts "82,5" as well as "82.5"; NaN when empty or not a number. */
function parseNumber(value: string): number {
  return value.trim() === "" ? NaN : Number(value.replace(",", "."));
}

export default function DeveloperEditDataScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isDeveloper = !!email && DEVELOPER_MODE_EMAILS.includes(email);

  const records = usePersonalRecordsStore((state) => state.records);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [recordWeight, setRecordWeight] = useState("");
  const [recordReps, setRecordReps] = useState("");
  const [weighInWeight, setWeighInWeight] = useState("");
  const [weighInBodyFat, setWeighInBodyFat] = useState("");
  const [weighInDaysAgo, setWeighInDaysAgo] = useState("0");

  if (!isDeveloper) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-center text-text-secondary">You don&apos;t have access to this screen.</Text>
        <Pressable onPress={() => goBack("/profile/account")} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const currentRecord = exercise ? records[exercise.id] : undefined;
  const recordWeightKg = parseNumber(recordWeight);
  const recordRepsCount = parseNumber(recordReps);
  const canSaveRecord = !!exercise && recordWeightKg > 0 && recordRepsCount >= 1;
  const weighInWeightKg = parseNumber(weighInWeight);
  const weighInBodyFatPercent = parseNumber(weighInBodyFat);
  const weighInDays = parseNumber(weighInDaysAgo);
  const canSaveWeighIn = weighInWeightKg > 0 && weighInDays >= 0;

  function handlePickExercise(picked: Exercise) {
    setExercise(picked);
    const existing = records[picked.id];
    setRecordWeight(existing ? String(existing.bestWeightKg) : "");
    setRecordReps(existing ? String(existing.bestReps) : "");
    setPickerVisible(false);
  }

  function handleSaveRecord() {
    if (!exercise || !canSaveRecord) return;
    const saved = setTestPersonalRecord(exercise.id, exercise.name, recordWeightKg, Math.round(recordRepsCount));
    if (saved) showToast("success", `${exercise.name} record set`, "Local only — never sent to the server.");
    else showToast("error", "Record hasn't synced yet", "Wait until your real record reaches the server, then try again.");
  }

  function handleSaveWeighIn() {
    if (!canSaveWeighIn) return;
    addTestWeighIn(weighInWeightKg, weighInBodyFatPercent > 0 ? weighInBodyFatPercent : null, Math.round(weighInDays));
    setWeighInWeight("");
    setWeighInBodyFat("");
    showToast("success", "Weigh-in added", "Local only — never sent to the server.");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/profile/developer-tools")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Edit Records & Weight</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="body-sm text-text-secondary">
          Changes stay on this device and are never sent to the server. Use &quot;Restore to Database State&quot; in Developer
          Tools to undo them.
        </Text>

        <View className="gap-3 rounded-2xl border border-brand-yellow/40 bg-surface p-4">
          <Text className="body-md font-body-semibold text-text-primary">Personal Record</Text>
          <Pressable
            onPress={() => setPickerVisible(true)}
            className="flex-row items-center justify-between rounded-2xl border border-divider bg-background px-4 py-3.5"
          >
            <Text className={`body-md ${exercise ? "text-text-primary" : "text-text-secondary"}`}>{exercise?.name ?? "Pick a lift"}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
          {exercise && (
            <Text className="caption text-text-secondary">
              Current: {currentRecord ? `${currentRecord.bestWeightKg} kg × ${currentRecord.bestReps}` : "no record yet"}
            </Text>
          )}
          <View className="flex-row gap-3">
            <NumberField label="Weight (kg)" value={recordWeight} onChangeText={setRecordWeight} placeholder="100" />
            <NumberField label="Reps" value={recordReps} onChangeText={setRecordReps} placeholder="5" />
          </View>
          <SaveButton label="Save Record" onPress={handleSaveRecord} disabled={!canSaveRecord} />
        </View>

        <View className="gap-3 rounded-2xl border border-brand-yellow/40 bg-surface p-4">
          <Text className="body-md font-body-semibold text-text-primary">Weigh-In</Text>
          <View className="flex-row gap-3">
            <NumberField label="Weight (kg)" value={weighInWeight} onChangeText={setWeighInWeight} placeholder="82.5" />
            <NumberField label="Body Fat %" value={weighInBodyFat} onChangeText={setWeighInBodyFat} placeholder="Optional" />
          </View>
          <View className="flex-row">
            <NumberField label="Days Ago" value={weighInDaysAgo} onChangeText={setWeighInDaysAgo} placeholder="0" />
            <View className="flex-1" />
          </View>
          <SaveButton label="Add Weigh-In" onPress={handleSaveWeighIn} disabled={!canSaveWeighIn} />
        </View>
      </ScrollView>

      <ExercisePickerModal
        visible={pickerVisible}
        title="Pick a Lift"
        subtitle="Choose the exercise to set a record for."
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickExercise}
        hideCreateRow
      />
    </View>
  );
}
