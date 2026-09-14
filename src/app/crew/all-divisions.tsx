import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { DivisionBadge } from "@/components/DivisionBadge";
import { DIVISIONS, DIVISION_XP_REQUIRED, PLAYER_DIVISION_MIN_POWER, divisionForPlayerPower, divisionIndex } from "@/lib/division";
import type { RankProfile } from "@/lib/rank";
import { userOverallPowerScore } from "@/lib/ranks-board";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { colors } from "@/theme";

const SCOPES = ["Crews", "Players"] as const;
type Scope = (typeof SCOPES)[number];

export default function AllDivisionsScreen() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>("Crews");

  const crewDivision = useCrewStore((state) => state.division);

  // Same inputs the Ranks tab itself uses for "Overall Power" (see ranks-board.ts's doc comment on
  // why this exact helper, not some other sum, is the one source of truth) — so the player division
  // shown here always matches what the Global leaderboard already computed for the same account.
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const records = usePersonalRecordsStore((state) => state.records);
  const removedDefaultIds = useTrackedLiftsStore((state) => state.removedDefaultIds);
  const hiddenAchievementIds = useTrackedLiftsStore((state) => state.hiddenAchievementIds);
  const customExerciseIds = useTrackedLiftsStore((state) => state.customExerciseIds);

  const profile: RankProfile = useMemo(
    () => ({ gender: onboarding.gender ?? "male", bodyWeightKg: onboarding.weightKg ?? 85, age: onboarding.age }),
    [onboarding.gender, onboarding.weightKg, onboarding.age],
  );
  const myPower = useMemo(
    () => userOverallPowerScore(records, profile, removedDefaultIds, hiddenAchievementIds, customExerciseIds),
    [records, profile, removedDefaultIds, hiddenAchievementIds, customExerciseIds],
  );
  const playerDivision = divisionForPlayerPower(myPower);

  const currentDivision = scope === "Crews" ? crewDivision : playerDivision;
  const currentIndex = divisionIndex(currentDivision);

  // Highest division first, like a ranked ladder poster.
  const steps = [...DIVISIONS].reverse();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Divisions</Text>
      </View>

      <View className="mx-4 mt-4 flex-row rounded-full border border-divider bg-surface p-1">
        {SCOPES.map((s) => {
          const active = s === scope;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
            >
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{s.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="body-sm mx-4 mt-3 text-text-secondary">
        {scope === "Crews" ? "How much XP a crew needs to climb out of each division." : "The power score needed to reach each division."}
      </Text>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {steps.map((step) => {
          const stepIndex = divisionIndex(step);
          const isCurrent = stepIndex === currentIndex;
          const isAchieved = stepIndex <= currentIndex;
          const pointsLabel =
            scope === "Crews"
              ? Number.isFinite(DIVISION_XP_REQUIRED[step])
                ? `${DIVISION_XP_REQUIRED[step].toLocaleString("en-US")} XP to climb`
                : "Top division"
              : `${PLAYER_DIVISION_MIN_POWER[step].toLocaleString("en-US")} power to enter`;

          return (
            <View
              key={step}
              className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
                isCurrent ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-surface"
              }`}
            >
              <DivisionBadge division={step} size={40} dimmed={!isAchieved} />

              <View className="flex-1">
                <Text
                  className={`body-md font-body-semibold ${isCurrent ? "text-brand-yellow" : isAchieved ? "text-text-primary" : "text-text-secondary"}`}
                >
                  {step}
                </Text>
                <Text className="caption text-text-secondary">{pointsLabel}</Text>
              </View>

              {isCurrent ? (
                <View className="rounded-full bg-brand-yellow px-2.5 py-1">
                  <Text className="caption font-body-bold text-brand-iron">YOU</Text>
                </View>
              ) : isAchieved ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success} />
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.neutral.textSecondary} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
