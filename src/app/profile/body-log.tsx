import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BmiGauge, calculateBmi } from "@/components/BmiGauge";
import { EditableText } from "@/components/EditableText";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { toDateKey } from "@/lib/date";
import { kgToLbs, lbsToKg } from "@/lib/units";
import type { WeightUnit } from "@/store/active-workout-store";
import { useBodyLogStore } from "@/store/body-log-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { colors, fontFamily } from "@/theme";

const RECENT_ENTRIES_LIMIT = 5;

// Same accent-bar-card language as ChallengeCard on the crew page's Challenges tab — a colored
// strip down the left edge and a bold skewed stat, here the logged weight instead of a title.
const weightStatStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 30,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

type BodyMetric = "weight" | "bodyFat" | "bmi";

const BODY_METRIC_LABELS: { key: BodyMetric; label: string }[] = [
  { key: "weight", label: "Weight" },
  { key: "bodyFat", label: "Body Fat" },
  { key: "bmi", label: "BMI" },
];

function displayWeight(weightKg: number, unit: WeightUnit): number {
  return unit === "kg" ? weightKg : kgToLbs(weightKg);
}

function AddEntrySheet({ visible, onClose, weightUnit }: { visible: boolean; onClose: () => void; weightUnit: WeightUnit }) {
  const addEntry = useBodyLogStore((state) => state.addEntry);
  const onboardingWeightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);

  const [weightInput, setWeightInput] = useState(
    onboardingWeightKg ? String(displayWeight(onboardingWeightKg, weightUnit)) : "",
  );
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // A tap outside the sheet is normally "close it" — but while the keyboard is up, that's almost
  // always the user just trying to dismiss the keyboard (e.g. to see the Save button), not abandon
  // what they were logging. First outside tap dismisses the keyboard only; a second one (keyboard
  // already down) actually closes the sheet.
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleBackdropPress() {
    if (keyboardVisible) Keyboard.dismiss();
    else onClose();
  }

  function handleSave() {
    const parsedInput = parseFloat(weightInput.replace(",", "."));
    if (!Number.isFinite(parsedInput) || parsedInput <= 0) return;
    const parsedWeightKg = weightUnit === "kg" ? parsedInput : lbsToKg(parsedInput);
    const parsedBodyFat = parseFloat(bodyFatPercent.replace(",", "."));

    addEntry({ weightKg: parsedWeightKg, bodyFatPercent: Number.isFinite(parsedBodyFat) && parsedBodyFat > 0 ? parsedBodyFat : null });
    // Keeps the rank system's bodyweight in sync with the latest log entry, same weight everywhere.
    setOnboardingData({ weightKg: parsedWeightKg });
    setBodyFatPercent("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={handleBackdropPress}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.neutral.surface }} className="gap-4 rounded-t-3xl border-t border-divider p-5">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Log Body Weight</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="caption font-body-semibold text-text-secondary">WEIGHT ({weightUnit.toUpperCase()})</Text>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder={weightUnit === "kg" ? "85" : "187"}
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
  const allEntries = useBodyLogStore((state) => state.entries);
  const removeEntry = useBodyLogStore((state) => state.removeEntry);
  const heightCm = useOnboardingStore((state) => state.onboarding.heightCm);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const setSnapshot = useProfileSnapshotStore((state) => state.setSnapshot);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);
  const [addOpen, setAddOpen] = useState(false);
  const [metric, setMetric] = useState<BodyMetric>("weight");
  const [showAllEntries, setShowAllEntries] = useState(false);

  // In snapshot mode, entries logged after the viewed date haven't happened yet from that
  // vantage point — same "as of that moment" rule every other snapshot-aware screen follows.
  const entries = useMemo(
    () => (snapshotAsOfMs != null ? allEntries.filter((entry) => entry.loggedAt <= snapshotAsOfMs) : allEntries),
    [allEntries, snapshotAsOfMs],
  );

  const sortedAsc = useMemo(() => [...entries].sort((a, b) => a.loggedAt - b.loggedAt), [entries]);
  const heightM = heightCm ? heightCm / 100 : null;

  const weightSeries = useMemo(
    () => sortedAsc.map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: displayWeight(entry.weightKg, weightUnit) })),
    [sortedAsc, weightUnit],
  );
  const bodyFatSeries = useMemo(
    () =>
      sortedAsc
        .filter((entry): entry is typeof entry & { bodyFatPercent: number } => entry.bodyFatPercent !== null)
        .map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: entry.bodyFatPercent })),
    [sortedAsc],
  );
  const bmiSeries = useMemo(
    () =>
      heightM
        ? sortedAsc.map((entry) => ({ date: toDateKey(new Date(entry.loggedAt)), value: Math.round(calculateBmi(entry.weightKg, heightM) * 10) / 10 }))
        : [],
    [sortedAsc, heightM],
  );

  const availableMetrics = BODY_METRIC_LABELS.filter((option) => option.key !== "bmi" || heightM);
  const activeMetric = availableMetrics.find((option) => option.key === metric) ?? availableMetrics[0];
  const seriesByMetric: Record<BodyMetric, { date: string; value: number }[]> = { weight: weightSeries, bodyFat: bodyFatSeries, bmi: bmiSeries };
  const chartLabel: Record<BodyMetric, string> = { weight: "body weight", bodyFat: "body fat", bmi: "BMI" };
  const chartUnit: Record<BodyMetric, string> = { weight: weightUnit, bodyFat: "%", bmi: "" };

  const startingWeightKg = sortedAsc[0]?.weightKg ?? null;
  const currentWeightKg = sortedAsc[sortedAsc.length - 1]?.weightKg ?? null;
  const weightChangeKg = startingWeightKg != null && currentWeightKg != null ? currentWeightKg - startingWeightKg : null;
  const highestWeightKg = entries.length > 0 ? Math.max(...entries.map((entry) => entry.weightKg)) : null;
  const lowestWeightKg = entries.length > 0 ? Math.min(...entries.map((entry) => entry.weightKg)) : null;
  const bodyFatValues = entries.map((entry) => entry.bodyFatPercent).filter((value): value is number => value !== null);
  const avgBodyFat = bodyFatValues.length > 0 ? bodyFatValues.reduce((sum, value) => sum + value, 0) / bodyFatValues.length : null;

  const currentBmi = heightM && currentWeightKg ? calculateBmi(currentWeightKg, heightM) : null;
  const visibleEntries = showAllEntries ? entries : entries.slice(0, RECENT_ENTRIES_LIMIT);

  function handleEntryPress(entryLoggedAt: number, entryWeightKg: number) {
    setSnapshot(entryLoggedAt, entryWeightKg);
    router.back();
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Body Log</Text>
        {snapshotAsOfMs == null && (
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8} style={{ position: "absolute", right: 16 }}>
            <Ionicons name="add-circle" size={26} color={colors.brand.yellow} />
          </Pressable>
        )}
      </View>

      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <View className="flex-row rounded-full border border-divider bg-surface p-1">
            {availableMetrics.map((option) => {
              const active = option.key === activeMetric.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setMetric(option.key)}
                  className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
                >
                  <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeMetric.key === "bmi" && currentBmi != null && (
            <View className="rounded-2xl border border-divider bg-surface p-4">
              <BmiGauge bmi={currentBmi} />
            </View>
          )}

          <View className="rounded-2xl border border-divider bg-surface p-4">
            <StrengthProgressChart
              exerciseName={chartLabel[activeMetric.key]}
              points={seriesByMetric[activeMetric.key]}
              title={activeMetric.label}
              unit={chartUnit[activeMetric.key]}
            />
          </View>
        </View>

        {entries.length > 0 && (
          <View className="gap-2">
            <StatSectionHeader label="Summary" />
            <StatCard>
              <StatRow
                id="profile.bodyLog.startingWeight"
                label="Starting Weight"
                value={startingWeightKg != null ? `${displayWeight(startingWeightKg, weightUnit)} ${weightUnit}` : "—"}
              />
              <StatRow
                id="profile.bodyLog.currentWeight"
                label="Current Weight"
                value={currentWeightKg != null ? `${displayWeight(currentWeightKg, weightUnit)} ${weightUnit}` : "—"}
              />
              <StatRow
                id="profile.bodyLog.netChange"
                label="Net Change"
                value={
                  startingWeightKg != null && currentWeightKg != null
                    ? `${weightChangeKg != null && weightChangeKg >= 0 ? "+" : ""}${(
                        displayWeight(currentWeightKg, weightUnit) - displayWeight(startingWeightKg, weightUnit)
                      ).toFixed(1)} ${weightUnit}`
                    : "—"
                }
                valueColor={weightChangeKg == null || weightChangeKg === 0 ? undefined : weightChangeKg > 0 ? colors.semantic.success : colors.semantic.error}
              />
              <StatRow
                id="profile.bodyLog.highest"
                label="Highest Recorded"
                value={highestWeightKg != null ? `${displayWeight(highestWeightKg, weightUnit)} ${weightUnit}` : "—"}
              />
              <StatRow
                id="profile.bodyLog.lowest"
                label="Lowest Recorded"
                value={lowestWeightKg != null ? `${displayWeight(lowestWeightKg, weightUnit)} ${weightUnit}` : "—"}
              />
              <StatRow id="profile.bodyLog.avgBodyFat" label="Avg Body Fat %" value={avgBodyFat != null ? `${avgBodyFat.toFixed(1)}%` : "—"} isLast />
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
            <>
              <StatSectionHeader label={showAllEntries ? `All Entries (${entries.length})` : "Recent Entries"} />
              {visibleEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => handleEntryPress(entry.loggedAt, entry.weightKg)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface"
                >
                  <View style={{ width: 4, backgroundColor: colors.brand.yellow }} />

                  <View className="items-center justify-center gap-0.5 px-4 py-3">
                    <EditableText id={`profile.bodyLog.entry.${entry.id}.weight`} style={weightStatStyle} className="text-brand-white" numberOfLines={1}>
                      {String(Math.round(displayWeight(entry.weightKg, weightUnit)))}
                    </EditableText>
                    <Text className="caption font-body-semibold text-text-secondary">{weightUnit.toUpperCase()}</Text>
                  </View>

                  <View className="flex-1 justify-center gap-1 border-l border-divider py-3 pl-3 pr-2">
                    <EditableText id={`profile.bodyLog.entry.${entry.id}.bodyFat`} className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
                      {entry.bodyFatPercent ? `${entry.bodyFatPercent}% Body Fat` : "No body fat logged"}
                    </EditableText>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="calendar-outline" size={11} color={colors.neutral.textSecondary} />
                      <Text className="caption font-body-semibold text-text-secondary" numberOfLines={1}>
                        {new Date(entry.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                  </View>

                  <Pressable onPress={() => removeEntry(entry.id)} hitSlop={8} className="items-center justify-center pr-3">
                    <Ionicons name="trash-outline" size={17} color={colors.neutral.textSecondary} />
                  </Pressable>
                </Pressable>
              ))}
              {entries.length > RECENT_ENTRIES_LIMIT && (
                <Pressable onPress={() => setShowAllEntries((value) => !value)} className="items-center rounded-full border border-divider py-3">
                  <Text className="body-sm font-body-semibold text-brand-yellow">
                    {showAllEntries ? "Show Less" : `Show All ${entries.length} Entries`}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AddEntrySheet visible={addOpen} onClose={() => setAddOpen(false)} weightUnit={weightUnit} />
    </View>
  );
}
