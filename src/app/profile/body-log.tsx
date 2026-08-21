import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey } from "@/lib/date";
import { useBodyLogStore } from "@/store/body-log-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

function AddEntrySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addEntry = useBodyLogStore((state) => state.addEntry);
  const onboardingWeightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);

  const [weightKg, setWeightKg] = useState(onboardingWeightKg ? String(onboardingWeightKg) : "");
  const [bodyFatPercent, setBodyFatPercent] = useState("");

  function handleSave() {
    const parsedWeight = parseFloat(weightKg.replace(",", "."));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) return;
    const parsedBodyFat = parseFloat(bodyFatPercent.replace(",", "."));

    addEntry({ weightKg: parsedWeight, bodyFatPercent: Number.isFinite(parsedBodyFat) && parsedBodyFat > 0 ? parsedBodyFat : null });
    // Keeps the rank system's bodyweight in sync with the latest log entry, same weight everywhere.
    setOnboardingData({ weightKg: parsedWeight });
    setBodyFatPercent("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.neutral.surface }} className="gap-4 rounded-t-3xl border-t border-divider p-5">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Log Body Weight</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="caption font-body-semibold text-text-secondary">WEIGHT (KG)</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="85"
                placeholderTextColor={colors.neutral.textSecondary}
                className="heading-4 rounded-2xl border border-divider bg-background px-4 py-3 text-text-primary"
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="caption font-body-semibold text-text-secondary">BODY FAT % (OPTIONAL)</Text>
              <TextInput
                value={bodyFatPercent}
                onChangeText={setBodyFatPercent}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.neutral.textSecondary}
                className="heading-4 rounded-2xl border border-divider bg-background px-4 py-3 text-text-primary"
              />
            </View>
          </View>

          <Pressable onPress={handleSave} className="items-center rounded-full bg-brand-yellow py-4">
            <Text className="body-md font-body-semibold text-brand-iron">Save Entry</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function BodyLogScreen() {
  const insets = useSafeAreaInsets();
  const entries = useBodyLogStore((state) => state.entries);
  const removeEntry = useBodyLogStore((state) => state.removeEntry);
  const [addOpen, setAddOpen] = useState(false);

  const sortedAsc = useMemo(() => [...entries].sort((a, b) => a.loggedAt - b.loggedAt), [entries]);
  const weightSeries = useMemo(
    () => sortedAsc.map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: entry.weightKg })),
    [sortedAsc],
  );

  const startingWeightKg = sortedAsc[0]?.weightKg ?? null;
  const currentWeightKg = sortedAsc[sortedAsc.length - 1]?.weightKg ?? null;
  const weightChangeKg = startingWeightKg != null && currentWeightKg != null ? currentWeightKg - startingWeightKg : null;
  const highestWeightKg = entries.length > 0 ? Math.max(...entries.map((entry) => entry.weightKg)) : null;
  const lowestWeightKg = entries.length > 0 ? Math.min(...entries.map((entry) => entry.weightKg)) : null;
  const bodyFatValues = entries.map((entry) => entry.bodyFatPercent).filter((value): value is number => value !== null);
  const avgBodyFat = bodyFatValues.length > 0 ? bodyFatValues.reduce((sum, value) => sum + value, 0) / bodyFatValues.length : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Body Log</Text>
        <Pressable onPress={() => setAddOpen(true)} hitSlop={8} style={{ position: "absolute", right: 16 }}>
          <Ionicons name="add-circle" size={26} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-divider bg-surface p-4">
          <StrengthProgressChart exerciseName="body weight" points={weightSeries} title="Body Weight" unit="kg" />
        </View>

        {entries.length > 0 && (
          <View className="gap-2">
            <StatSectionHeader label="Summary" />
            <StatCard>
              <StatRow label="Starting Weight" value={startingWeightKg != null ? `${startingWeightKg} kg` : "—"} />
              <StatRow label="Current Weight" value={currentWeightKg != null ? `${currentWeightKg} kg` : "—"} />
              <StatRow
                label="Net Change"
                value={weightChangeKg != null ? `${weightChangeKg >= 0 ? "+" : ""}${weightChangeKg.toFixed(1)} kg` : "—"}
                valueColor={weightChangeKg == null || weightChangeKg === 0 ? undefined : weightChangeKg > 0 ? colors.semantic.success : colors.semantic.error}
              />
              <StatRow label="Highest Recorded" value={highestWeightKg != null ? `${highestWeightKg} kg` : "—"} />
              <StatRow label="Lowest Recorded" value={lowestWeightKg != null ? `${lowestWeightKg} kg` : "—"} />
              <StatRow label="Avg Body Fat %" value={avgBodyFat != null ? `${avgBodyFat.toFixed(1)}%` : "—"} isLast />
            </StatCard>
          </View>
        )}

        <View className="gap-2.5">
          {entries.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Ionicons name="body-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">No entries yet.</Text>
              <Text className="body-sm text-text-secondary">Tap + to log your weight.</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
                  <Ionicons name="scale-outline" size={17} color={colors.brand.yellow} />
                </View>
                <View className="flex-1">
                  <Text className="body-md font-body-semibold text-text-primary">
                    {entry.weightKg}kg{entry.bodyFatPercent ? ` · ${entry.bodyFatPercent}% BF` : ""}
                  </Text>
                  <Text className="caption text-text-secondary">
                    {new Date(entry.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
                <Pressable onPress={() => removeEntry(entry.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={17} color={colors.neutral.textSecondary} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AddEntrySheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
