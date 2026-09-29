import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ContributorsList } from "@/components/ContributorsList";
import { CrewSwitcher } from "@/components/CrewSwitcher";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { HomeRowPair } from "@/components/HomeRowPair";
import { HorizontalBarChart } from "@/components/HorizontalBarChart";
import { RankBadge } from "@/components/RankBadge";
import { SegmentedProportionBar } from "@/components/SegmentedProportionBar";
import { StatTile } from "@/components/StatTile";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { perMemberContributions } from "@/lib/challenge-progress";
import {
  crewExerciseVolume,
  crewExerciseVolumeTrend,
  crewMuscleSplit,
  crewPowerTrend,
  crewTotals,
  crewWeeklyActivity,
  rangeDateKeys,
  realTotalVolumeInRange,
  TRACKABLE_EXERCISES,
  type StatsRange,
} from "@/lib/crew-stats";
import { DIVISION_COLOR } from "@/lib/division";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import type { RankProfile } from "@/lib/rank";
import { displayWeight, formatWeight } from "@/lib/units";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const RANGES: StatsRange[] = ["week", "month", "allTime"];
const RANGE_LABEL: Record<StatsRange, string> = { week: "WEEK", month: "MONTH", allTime: "ALL TIME" };

const TOP_LIFTS: { exerciseId: string; exerciseName: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { exerciseId: "Barbell_Squat", exerciseName: "Squat", icon: "walk-outline" },
  { exerciseId: "Barbell_Bench_Press_-_Medium_Grip", exerciseName: "Bench Press", icon: "barbell-outline" },
  { exerciseId: "Barbell_Deadlift", exerciseName: "Deadlift", icon: "body-outline" },
];

const TOTAL_STATS: { key: keyof ReturnType<typeof crewTotals>; label: string; icon: keyof typeof Ionicons.glyphMap; isWeight: boolean }[] = [
  { key: "volumeKg", label: "VOLUME", icon: "barbell", isWeight: true },
  { key: "workouts", label: "WORKOUTS", icon: "flame", isWeight: false },
  { key: "sets", label: "SETS", icon: "layers", isWeight: false },
];

/** A section's own eyebrow+title, half-width — `MUSCLE SPLIT` / `WEEKLY ACTIVITY` side by side via
 * `HomeRowPair`, the same divider treatment `HomeMuscleHero` uses for its own two-column split. */
function StatSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 0.5 }} className="text-text-primary">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** The Crew Stats tab — a real dashboard, same flowing no-boxed-cards system as the rest of Crew:
 * `CrewSwitcher` for the range, hairline-divided rows for Top Lifts, a `HomeRowPair` split instead
 * of two separate bordered mini-cards for Muscle Split/Weekly Activity, and Crew Power's headline
 * number rolling up with `number-flow` instead of sitting static in a tinted box. */
export function StatsTab() {
  const [range, setRange] = useState<StatsRange>("week");
  const [selectedExercise, setSelectedExercise] = useState({ exerciseId: TRACKABLE_EXERCISES[0].exerciseId, exerciseName: TRACKABLE_EXERCISES[0].exerciseName });
  const [pickerOpen, setPickerOpen] = useState(false);

  const members = useCrewStore((state) => state.members);
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewPowerChangePercent = useCrewStore((state) => state.crewPowerChangePercent);
  const divisionHistory = useCrewStore((state) => state.divisionHistory);
  const myWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const memberActivityLookup = (memberId: string) => membersActivity[memberId] ?? { recentWorkouts: [], records: {} };

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const weightUnit = useWeightUnit();
  const records = usePersonalRecordsStore((state) => state.records);
  const rankProfile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const rankCards = useMemo(() => buildLiftRankCards(records, rankProfile, "gym"), [records, rankProfile]);

  const { startKey, endKey } = rangeDateKeys(range);
  const powerTrend = crewPowerTrend(range, crewPower);
  const totals = crewTotals(members, myWorkouts, membersActivity, startKey, endKey);

  const topLifts = TOP_LIFTS.map((lift) => ({
    ...lift,
    volume: crewExerciseVolume(lift.exerciseId, members, myWorkouts, membersActivity, startKey, endKey),
  })).sort((a, b) => b.volume - a.volume);

  const selectedTrend = crewExerciseVolumeTrend(selectedExercise.exerciseId, members, myWorkouts, membersActivity, startKey, endKey);

  const myTotalVolume = realTotalVolumeInRange(myWorkouts, startKey, endKey);
  const topContributors = perMemberContributions({ type: "totalVolume" }, members, myTotalVolume, startKey, endKey, memberActivityLookup);

  const muscleSplit = crewMuscleSplit(members, myWorkouts, membersActivity);
  const weeklyActivity = crewWeeklyActivity(members, myWorkouts, membersActivity);
  const timeline = divisionHistory.map((entry, index) => {
    const next = divisionHistory[index + 1];
    const endMs = next ? next.reachedAt : Date.now();
    const days = Math.max(0, Math.round((endMs - entry.reachedAt) / 86400000));
    return { ...entry, days, isCurrent: !next };
  });

  return (
    <View className="mx-4 mt-4 gap-6">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={HOME_SECTION_TITLE}>THE NUMBERS</Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="stats-chart" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary">Every rep, tracked. No hiding from the grind.</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)}>
        <CrewSwitcher options={RANGES} labels={RANGE_LABEL} value={range} onChange={setRange} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="flex-row gap-3">
        {TOTAL_STATS.map(({ key, label, icon, isWeight }) => (
          <StatTile
            key={key}
            id={`crew.stats.${key}`}
            icon={icon}
            value={isWeight ? formatWeight(totals[key], weightUnit) : totals[key].toLocaleString("en-US")}
            label={label}
          />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(180).springify().damping(16).mass(0.6)} className="gap-3 border-t border-divider pt-4">
        <Text style={HOME_EYEBROW}>CREW POWER</Text>
        <View className="flex-row items-end gap-2">
          <NumberFlow value={crewPower} fontSize={36} color={colors.brand.white} fontWeight="800" groupSeparator="," />
          <View className="mb-1.5 flex-row items-center gap-1">
            <Ionicons name="trending-up" size={13} color={colors.semantic.success} />
            <EditableText id="crew.stats.power.changePercent" className="caption font-body-semibold" style={{ color: colors.semantic.success }}>
              {`${crewPowerChangePercent}% vs last week`}
            </EditableText>
          </View>
        </View>
        <StrengthProgressChart exerciseName="Crew Power" points={powerTrend} title="Trend" unit="pts" />
      </Animated.View>

      <View className="gap-3 border-t border-divider pt-4">
        <Text style={HOME_EYEBROW}>TOP LIFTS (CREW TOTAL)</Text>
        <View>
          {topLifts.map((lift, index) => (
            <View key={lift.exerciseId} className={`flex-row items-center gap-3 py-3 ${index === topLifts.length - 1 ? "" : "border-b border-divider"}`}>
              <HomeRowLead kind="flat">
                <Ionicons name={lift.icon} size={16} color={index === 0 ? colors.brand.yellow : colors.neutral.textSecondary} />
              </HomeRowLead>
              <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]} className="flex-1">
                {lift.exerciseName}
              </Text>
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.brand.yellow }}>{formatWeight(lift.volume, weightUnit).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3 border-t border-divider pt-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="trophy" size={14} color={colors.brand.yellow} />
          <Text style={HOME_EYEBROW}>TOP CONTRIBUTORS</Text>
        </View>
        <ContributorsList contributors={topContributors.map((entry) => ({ ...entry, amount: displayWeight(entry.amount, weightUnit) }))} unit={weightUnit} />
      </View>

      <Animated.View entering={FadeInUp.delay(240).springify().damping(16).mass(0.6)} className="border-t border-divider pt-4">
        <HomeRowPair
          left={
            <StatSection title="MUSCLE SPLIT">
              {muscleSplit.length === 0 ? <Text style={HOME_ROW_DETAIL}>No sets logged yet.</Text> : <SegmentedProportionBar segments={muscleSplit} />}
            </StatSection>
          }
          right={
            <StatSection title="WEEKLY ACTIVITY">
              <HorizontalBarChart items={weeklyActivity} />
            </StatSection>
          }
        />
      </Animated.View>

      <View className="gap-3 border-t border-divider pt-4">
        <Text style={HOME_EYEBROW}>EXPLORE ANY LIFT</Text>
        <Pressable onPress={() => setPickerOpen(true)} className="flex-row items-center gap-3 active:opacity-70">
          <HomeRowLead kind="flat">
            <Ionicons name="search" size={16} color={colors.brand.yellow} />
          </HomeRowLead>
          <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]} className="flex-1">
            {selectedExercise.exerciseName}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.neutral.textSecondary} />
        </Pressable>
        <StrengthProgressChart
          exerciseName={selectedExercise.exerciseName}
          points={selectedTrend.map((point) => ({ ...point, value: displayWeight(point.value, weightUnit) }))}
          title="Crew Volume"
          unit={weightUnit}
        />
      </View>

      <ExercisePickerModal
        visible={pickerOpen}
        title="Explore Any Lift"
        subtitle="Pick any exercise to see the crew's combined volume on it."
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setSelectedExercise({ exerciseId: exercise.id, exerciseName: exercise.name });
          setPickerOpen(false);
        }}
        hideCreateRow
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, rankCards, records, rankProfile)} size={34} />}
      />

      <View className="gap-3 border-t border-divider pt-4">
        <Text style={HOME_EYEBROW}>DIVISION TIMELINE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
          <View className="flex-row items-start">
            {timeline.map((entry, index) => {
              const tint = DIVISION_COLOR[entry.division];
              const isLast = index === timeline.length - 1;
              return (
                <View key={entry.division} className="flex-row items-start">
                  <View className="items-center" style={{ width: 84 }}>
                    <View
                      className="items-center justify-center rounded-full border-2 bg-background"
                      style={{ width: 48, height: 48, borderColor: entry.isCurrent ? tint : colors.neutral.divider }}
                    >
                      <DivisionBadge division={entry.division} size={36} />
                    </View>
                    <Text className="caption mt-2 font-body-bold text-text-primary" numberOfLines={1}>
                      {entry.division}
                    </Text>
                    <Text className="caption text-center text-text-secondary" numberOfLines={1}>
                      {entry.isCurrent ? `${entry.days}d so far` : `${entry.days}d`}
                    </Text>
                  </View>
                  {!isLast && <View style={{ width: 22, height: 2, backgroundColor: colors.neutral.divider, marginTop: 23 }} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
