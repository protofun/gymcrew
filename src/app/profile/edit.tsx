import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnboardingStore, type Gender } from "@/store/onboarding-store";
import { colors } from "@/theme";

const GENDERS: { key: Gender; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
  { key: "elite", label: "Elite" },
];

const GOALS = [
  { key: "build-muscle", label: "Build Muscle" },
  { key: "lose-weight", label: "Lose Weight" },
  { key: "get-stronger", label: "Get Stronger" },
  { key: "improve-fitness", label: "Improve Fitness" },
  { key: "stay-healthy", label: "Stay Healthy" },
];

function FieldLabel({ label }: { label: string }) {
  return <Text className="caption font-body-semibold text-text-secondary">{label.toUpperCase()}</Text>;
}

function TextField({ label, value, onChangeText, keyboardType, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "numeric"; placeholder?: string }) {
  return (
    <View className="gap-1.5">
      <FieldLabel label={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md rounded-2xl border border-divider bg-surface px-4 py-3.5 text-text-primary"
        style={{ outlineWidth: 0, outlineColor: "transparent" }}
      />
    </View>
  );
}

function ChipPicker<T extends string>({ label, options, value, onChange }: { label: string; options: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <View className="gap-1.5">
      <FieldLabel label={label} />
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              className={`rounded-full border px-4 py-2.5 ${active ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
            >
              <Text className={`body-sm font-body-semibold ${active ? "text-brand-iron" : "text-text-primary"}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);

  const [fullName, setFullName] = useState(onboarding.fullName ?? "");
  const [gymName, setGymName] = useState(onboarding.gymName ?? "");
  const [age, setAge] = useState(String(onboarding.age ?? ""));
  const [heightCm, setHeightCm] = useState(String(onboarding.heightCm ?? ""));
  const [weightKg, setWeightKg] = useState(String(onboarding.weightKg ?? ""));
  const [gender, setGender] = useState<Gender>(onboarding.gender ?? "male");
  const [goal, setGoal] = useState(onboarding.goal ?? GOALS[0].key);
  const [experienceLevel, setExperienceLevel] = useState(onboarding.experienceLevel ?? EXPERIENCE_LEVELS[0].key);

  function handleSave() {
    const parsedAge = parseInt(age, 10);
    const parsedHeight = parseFloat(heightCm.replace(",", "."));
    const parsedWeight = parseFloat(weightKg.replace(",", "."));

    setOnboardingData({
      fullName: fullName.trim(),
      gymName: gymName.trim(),
      gender,
      goal,
      experienceLevel,
      ...(Number.isFinite(parsedAge) && parsedAge > 0 ? { age: parsedAge } : {}),
      ...(Number.isFinite(parsedHeight) && parsedHeight > 0 ? { heightCm: parsedHeight } : {}),
      ...(Number.isFinite(parsedWeight) && parsedWeight > 0 ? { weightKg: parsedWeight } : {}),
    });
    router.back();
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Edit Profile</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
        <TextField label="Home Gym" value={gymName} onChangeText={setGymName} placeholder="e.g. Iron Temple Gym" />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Age" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="28" />
          </View>
          <View className="flex-1">
            <TextField label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="180" />
          </View>
          <View className="flex-1">
            <TextField label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="85" />
          </View>
        </View>

        <ChipPicker label="Gender" options={GENDERS} value={gender} onChange={setGender} />
        <ChipPicker label="Goal" options={GOALS} value={goal} onChange={setGoal} />
        <ChipPicker label="Experience Level" options={EXPERIENCE_LEVELS} value={experienceLevel} onChange={setExperienceLevel} />

        <View className="flex-row items-start gap-2 rounded-2xl border border-divider bg-surface p-3">
          <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} style={{ marginTop: 1 }} />
          <Text className="body-sm flex-1 text-text-secondary">
            Weight and gender feed your rank calculations — keep them accurate for fair comparisons.
          </Text>
        </View>

        <Pressable onPress={handleSave} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
