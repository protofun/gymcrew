import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RankBadge } from "@/components/RankBadge";
import { TierPickerSheet } from "@/components/TierPickerSheet";
import { EXERCISE_EQUIPMENT_OPTIONS, formatMuscleName } from "@/data/exercises";
import { WEEKDAYS, WEEKDAY_SHORT_LABEL, type Weekday } from "@/data/weekdays";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import type { ExperienceLevel, SplitPreferences, TargetMode, TrainingStyle } from "@/lib/workout-split-generator";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

const SESSION_LENGTH_OPTIONS = [30, 45, 60, 75, 90] as const;

const STYLE_OPTIONS: { key: TrainingStyle; label: string }[] = [
  { key: "ppl", label: "Push / Pull / Legs" },
  { key: "upper-lower", label: "Upper / Lower" },
  { key: "bro-split", label: "Bro Split" },
  { key: "full-body", label: "Full Body" },
  { key: "no-preference", label: "No Preference" },
];

const EXPERIENCE_OPTIONS: { key: ExperienceLevel; label: string }[] = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

const SETS_OPTIONS = [2, 3, 4, 5] as const;

/** A sensible default weekday spread per day-count — alternating rather than clustered, so the
 * default doesn't immediately trip the generator's own back-to-back recovery rule. */
const DEFAULT_TRAINING_DAYS: Record<number, Weekday[]> = {
  1: ["Wednesday"],
  2: ["Tuesday", "Friday"],
  3: ["Monday", "Wednesday", "Friday"],
  4: ["Monday", "Tuesday", "Thursday", "Friday"],
  5: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  7: [...WEEKDAYS],
};

function SectionLabel({ children }: { children: string }) {
  return <Text className="caption font-body-semibold text-text-secondary">{children}</Text>;
}

/** A small labeled numeric input — for values the user should type themselves (reps, rest seconds)
 * rather than pick from a preset category, since those genuinely vary person to person. */
function NumberField({ label, value, onChangeValue, suffix }: { label: string; value: number; onChangeValue: (value: number) => void; suffix?: string }) {
  const [text, setText] = useState(String(value));

  function commit(raw: string) {
    setText(raw);
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) onChangeValue(parsed);
  }

  return (
    <View className="flex-1 gap-1.5">
      <Text className="caption text-text-secondary">{label}</Text>
      <View className="flex-row items-center gap-1.5 rounded-2xl border border-divider bg-surface px-3 py-2.5">
        <TextInput
          value={text}
          onChangeText={commit}
          onBlur={() => setText(String(value))}
          keyboardType="number-pad"
          className="body-md flex-1 font-body-semibold text-text-primary"
          style={{ minWidth: 0 }}
        />
        {suffix && <Text className="caption text-text-secondary">{suffix}</Text>}
      </View>
    </View>
  );
}

function SegmentedRow<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map(({ key, label }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            className={`rounded-full px-4 py-2 ${active ? "bg-brand-yellow" : "border border-divider bg-surface"}`}
          >
            <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WorkoutSplitSetupScreen() {
  const insets = useSafeAreaInsets();
  const { muscle: deepLinkMuscle } = useLocalSearchParams<{ muscle?: MuscleGroup }>();

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const workoutsPerWeek = useOnboardingStore((state) => state.onboarding.workoutsPerWeek);
  const records = usePersonalRecordsStore((state) => state.records);
  const setPreferences = useWorkoutSplitStore((state) => state.setPreferences);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);

  function currentTierFor(group: MuscleGroup): RankTier {
    const rank = ranksByGroup[group];
    return rank?.status === "ranked" ? rank.tier : RANK_TIERS[0];
  }
  function nextTierUpFrom(tier: RankTier): RankTier {
    return RANK_TIERS[Math.min(RANK_TIERS.length - 1, RANK_TIERS.indexOf(tier) + 1)];
  }

  const [targetMode, setTargetMode] = useState<TargetMode>(deepLinkMuscle ? "custom" : "balanced");
  const [targetTier, setTargetTier] = useState<RankTier | null>(null);
  const [customTargets, setCustomTargets] = useState<Partial<Record<MuscleGroup, RankTier>>>(() =>
    deepLinkMuscle ? { [deepLinkMuscle]: nextTierUpFrom(currentTierFor(deepLinkMuscle)) } : {},
  );
  const [pickerContext, setPickerContext] = useState<"target-rank" | MuscleGroup | null>(null);

  const defaultDays = DEFAULT_TRAINING_DAYS[Math.min(7, Math.max(1, workoutsPerWeek ?? 4))] ?? DEFAULT_TRAINING_DAYS[4];
  const [trainingDays, setTrainingDays] = useState<Weekday[]>(defaultDays);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState<number>(60);
  const [style, setStyle] = useState<TrainingStyle>("no-preference");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel>("intermediate");
  const [preferredSets, setPreferredSets] = useState<number>(3);
  const [repsMin, setRepsMin] = useState<number>(8);
  const [repsMax, setRepsMax] = useState<number>(12);
  const [restSecondsBetweenSets, setRestSecondsBetweenSets] = useState<number>(90);

  const canContinue = trainingDays.length > 0 && (targetMode !== "target-rank" || targetTier !== null);

  function toggleDay(day: Weekday) {
    setTrainingDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))));
  }

  function toggleEquipment(option: string) {
    setEquipment((current) => (current.includes(option) ? current.filter((e) => e !== option) : [...current, option]));
  }

  function handleGenerate() {
    if (!canContinue) return;
    const preferences: SplitPreferences = {
      targetMode,
      targetTier: targetTier ?? undefined,
      customTargets,
      trainingDays,
      sessionLengthMinutes,
      style,
      equipment,
      experience,
      preferredSets,
      repsMin: Math.min(repsMin, repsMax),
      repsMax: Math.max(repsMin, repsMax),
      restSecondsBetweenSets,
    };
    setPreferences(preferences);
    router.push("/workout-split/reveal");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Choose Your Target</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 100, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>WHAT&apos;S YOUR TARGET?</SectionLabel>
          <SegmentedRow
            options={[
              { key: "balanced" as TargetMode, label: "Balanced" },
              { key: "target-rank" as TargetMode, label: "Target Rank" },
              { key: "custom" as TargetMode, label: "Custom" },
            ]}
            value={targetMode}
            onChange={setTargetMode}
          />

          {targetMode === "balanced" && (
            <Text className="body-sm text-text-secondary">Bring your weaker muscle groups closer to your strongest ones.</Text>
          )}

          {targetMode === "target-rank" && (
            <Pressable
              onPress={() => setPickerContext("target-rank")}
              style={PRESSED_STYLE}
              className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3"
            >
              <View className="flex-row items-center gap-2.5">
                {targetTier ? <RankBadge tier={targetTier} size={22} /> : <Ionicons name="trophy-outline" size={18} color={colors.neutral.textSecondary} />}
                <Text className="body-md font-body-semibold text-text-primary">{targetTier ? formatRankTier(targetTier) : "Pick a rank"}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.neutral.textSecondary} />
            </Pressable>
          )}

          {targetMode === "custom" && (
            <View className="gap-2">
              {ALL_MUSCLE_GROUPS.map((group) => {
                const target = customTargets[group] ?? currentTierFor(group);
                return (
                  <Pressable
                    key={group}
                    onPress={() => setPickerContext(group)}
                    style={PRESSED_STYLE}
                    className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-2.5"
                  >
                    <Text className="body-sm font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
                    <View className="flex-row items-center gap-1.5">
                      <RankBadge tier={target} size={20} />
                      <Text className="caption font-body-semibold text-text-secondary">{formatRankTier(target)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>HOW MANY DAYS DO YOU TRAIN?</SectionLabel>
          <View className="flex-row justify-between">
            {WEEKDAYS.map((day) => {
              const active = trainingDays.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`h-11 w-11 items-center justify-center rounded-full ${active ? "bg-brand-yellow" : "border border-divider bg-surface"}`}
                >
                  <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{WEEKDAY_SHORT_LABEL[day][0]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>SESSION LENGTH</SectionLabel>
          <SegmentedRow
            options={SESSION_LENGTH_OPTIONS.map((minutes) => ({ key: String(minutes), label: minutes === 90 ? "90+ min" : `${minutes} min` }))}
            value={String(sessionLengthMinutes)}
            onChange={(value) => setSessionLengthMinutes(Number(value))}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>SETS PER EXERCISE</SectionLabel>
          <SegmentedRow
            options={SETS_OPTIONS.map((sets) => ({ key: String(sets), label: `${sets} sets` }))}
            value={String(preferredSets)}
            onChange={(value) => setPreferredSets(Number(value))}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(130).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>REPS &amp; REST</SectionLabel>
          <View className="flex-row gap-3">
            <NumberField label="Reps (min)" value={repsMin} onChangeValue={setRepsMin} />
            <NumberField label="Reps (max)" value={repsMax} onChangeValue={setRepsMax} />
            <NumberField label="Rest" value={restSecondsBetweenSets} onChangeValue={setRestSecondsBetweenSets} suffix="sec" />
          </View>
          <Text className="caption text-text-secondary">
            Fewer sets, lighter reps, or shorter rest all fit more exercises into your session — the plan adjusts to match.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>TRAINING STYLE</SectionLabel>
          <SegmentedRow options={STYLE_OPTIONS} value={style} onChange={setStyle} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>AVAILABLE EQUIPMENT</SectionLabel>
          <Text className="caption text-text-secondary">Leave blank to allow any equipment.</Text>
          <View className="flex-row flex-wrap gap-2">
            {EXERCISE_EQUIPMENT_OPTIONS.map((option) => {
              const active = equipment.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleEquipment(option)}
                  className={`rounded-full px-4 py-2 ${active ? "bg-brand-yellow" : "border border-divider bg-surface"}`}
                >
                  <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{formatMuscleName(option)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).springify().damping(16).mass(0.6)} className="gap-2.5">
          <SectionLabel>TRAINING EXPERIENCE</SectionLabel>
          <SegmentedRow options={EXPERIENCE_OPTIONS} value={experience} onChange={setExperience} />
        </Animated.View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable
          onPress={handleGenerate}
          disabled={!canContinue}
          style={({ pressed }) => ({ opacity: !canContinue ? 0.4 : pressed ? 0.85 : 1 })}
          className="items-center rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-md font-body-semibold text-brand-iron">Generate My Split</Text>
        </Pressable>
      </View>

      <TierPickerSheet
        visible={pickerContext !== null}
        title={pickerContext === "target-rank" ? "Pick a target rank" : pickerContext ? `Target for ${formatMuscleLabel(pickerContext)}` : ""}
        selectedTier={pickerContext === "target-rank" ? targetTier : pickerContext ? (customTargets[pickerContext] ?? currentTierFor(pickerContext)) : null}
        onSelect={(tier) => {
          if (pickerContext === "target-rank") setTargetTier(tier);
          else if (pickerContext) setCustomTargets((current) => ({ ...current, [pickerContext]: tier }));
          setPickerContext(null);
        }}
        onClose={() => setPickerContext(null)}
      />
    </View>
  );
}
