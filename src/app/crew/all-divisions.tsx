import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { CrewSwitcher } from "@/components/CrewSwitcher";
import { DivisionBadge } from "@/components/DivisionBadge";
import { HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
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
const SCOPE_LABEL: Record<Scope, string> = { Crews: "CREWS", Players: "PLAYERS" };

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

  // The ladder-progress ring — same `CircularProgress` language every other screen this pass has
  // added, here showing how far up the WHOLE ladder the current division sits.
  const ladderPercent = Math.round(((currentIndex + 1) / DIVISIONS.length) * 100);
  const ladderProgress = useSharedValue(0);
  useEffect(() => {
    ladderProgress.value = withTiming(ladderPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [ladderPercent, ladderProgress]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Divisions</Text>
      </View>

      <View className="mx-4 mt-4">
        <CrewSwitcher options={[...SCOPES]} labels={SCOPE_LABEL} value={scope} onChange={setScope} />
      </View>

      <View className="mx-4 mt-3 flex-row items-center gap-3">
        <View style={{ width: 56, height: 56 }} className="items-center justify-center">
          <CircularProgress
            progress={ladderProgress}
            size={56}
            strokeWidth={5}
            gap={0}
            outerCircleColor={colors.neutral.divider}
            progressCircleColor={colors.brand.yellow}
            backgroundColor="transparent"
            renderIcon={() => <DivisionBadge division={currentDivision} size={28} />}
          />
        </View>
        <Text className="body-sm flex-1 text-text-secondary">
          {scope === "Crews" ? "How much XP a crew needs to climb out of each division." : "The power score needed to reach each division."}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {steps.map((step, index) => {
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
            <View key={step} className={`flex-row items-center gap-3 py-3 ${index === steps.length - 1 ? "" : "border-b border-divider"}`}>
              <DivisionBadge division={step} size={40} dimmed={!isAchieved} />

              <View className="flex-1">
                <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18, color: isCurrent ? colors.brand.yellow : isAchieved ? colors.brand.white : colors.neutral.textSecondary }]}>
                  {step.toUpperCase()}
                </Text>
                <Text style={HOME_ROW_DETAIL}>{pointsLabel}</Text>
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
