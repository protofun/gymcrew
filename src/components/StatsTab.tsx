import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ContributorsList } from "@/components/ContributorsList";
import { DivisionBadge } from "@/components/DivisionBadge";
import { HorizontalBarChart } from "@/components/HorizontalBarChart";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { SegmentedProportionBar } from "@/components/SegmentedProportionBar";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { generateMemberWorkoutSessions } from "@/data/workout-log";
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
import { useCrewStore } from "@/store/crew-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const RANGES: { key: StatsRange; label: string }[] = [
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
  { key: "allTime", label: "ALL TIME" },
];

const TOP_LIFTS: { exerciseId: string; exerciseName: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { exerciseId: "Barbell_Squat", exerciseName: "Squat", icon: "walk-outline" },
  { exerciseId: "Barbell_Bench_Press_-_Medium_Grip", exerciseName: "Bench Press", icon: "barbell-outline" },
  { exerciseId: "Barbell_Deadlift", exerciseName: "Deadlift", icon: "body-outline" },
];

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const headerStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const TOTAL_STATS: { key: keyof ReturnType<typeof crewTotals>; label: string; icon: keyof typeof Ionicons.glyphMap; suffix: string }[] = [
  { key: "volumeKg", label: "VOLUME", icon: "barbell", suffix: "kg" },
  { key: "workouts", label: "WORKOUTS", icon: "flame", suffix: "" },
  { key: "sets", label: "SETS", icon: "layers", suffix: "" },
];

export function StatsTab() {
  const [range, setRange] = useState<StatsRange>("week");
  const [selectedExerciseId, setSelectedExerciseId] = useState(TRACKABLE_EXERCISES[0].exerciseId);

  const members = useCrewStore((state) => state.members);
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewPowerChangePercent = useCrewStore((state) => state.crewPowerChangePercent);
  const divisionHistory = useCrewStore((state) => state.divisionHistory);
  const myWorkouts = useWorkoutHistoryStore((state) => state.workouts);

  const { startKey, endKey } = rangeDateKeys(range);
  const powerTrend = crewPowerTrend(range, crewPower);
  const totals = crewTotals(members, myWorkouts, startKey, endKey);

  const topLifts = TOP_LIFTS.map((lift) => ({
    ...lift,
    volume: crewExerciseVolume(lift.exerciseId, lift.exerciseName, members, myWorkouts, startKey, endKey),
  })).sort((a, b) => b.volume - a.volume);

  const selectedExercise = TRACKABLE_EXERCISES.find((exercise) => exercise.exerciseId === selectedExerciseId) ?? TRACKABLE_EXERCISES[0];
  const selectedTrend = crewExerciseVolumeTrend(
    selectedExercise.exerciseId,
    selectedExercise.exerciseName,
    members,
    myWorkouts,
    startKey,
    endKey,
  );

  const myTotalVolume = realTotalVolumeInRange(myWorkouts, startKey, endKey);
  const topContributors = perMemberContributions(
    { type: "totalVolume" },
    members,
    myTotalVolume,
    startKey,
    endKey,
    generateMemberWorkoutSessions,
  );

  const muscleSplit = crewMuscleSplit(members, myWorkouts);
  const weeklyActivity = crewWeeklyActivity(members, myWorkouts);
  const timeline = divisionHistory.map((entry, index) => {
    const next = divisionHistory[index + 1];
    const endMs = next ? next.reachedAt : Date.now();
    const days = Math.max(0, Math.round((endMs - entry.reachedAt) / 86400000));
    return { ...entry, days, isCurrent: !next };
  });

  return (
    <View className="mx-4 mt-4 gap-4">
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-1">
        <Text style={headerStyle} className="text-brand-white">
          THE NUMBERS
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="stats-chart" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary">Every rep, tracked. No hiding from the grind.</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)}
        className="flex-row rounded-full border border-divider bg-surface p-1"
      >
        {RANGES.map(({ key, label }) => {
          const active = key === range;
          return (
            <Pressable key={key} onPress={() => setRange(key)} className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}>
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)} className="flex-row gap-3">
        {TOTAL_STATS.map(({ key, label, icon, suffix }) => (
          <View key={key} className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-3">
            <Ionicons name={icon} size={15} color={colors.brand.yellow} />
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 22 }} className="text-text-primary">
              {totals[key].toLocaleString("en-US")}
              {suffix}
            </Text>
            <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(200).springify().damping(16).mass(0.6)}
        className="gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4"
      >
        <View>
          <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
            CREW POWER
          </Text>
          <View className="flex-row items-end gap-2">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 36, lineHeight: 38 }} className="text-text-primary">
              {crewPower.toLocaleString("en-US")}
            </Text>
            <View className="mb-1.5 flex-row items-center gap-1">
              <Ionicons name="trending-up" size={13} color={colors.semantic.success} />
              <Text className="caption font-body-semibold" style={{ color: colors.semantic.success }}>
                {crewPowerChangePercent}% vs last week
              </Text>
            </View>
          </View>
        </View>
        <StrengthProgressChart exerciseName="Crew Power" points={powerTrend} title="Trend" unit="pts" />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(260).springify().damping(16).mass(0.6)}
        className="gap-3 rounded-2xl border border-divider bg-surface p-4"
      >
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
          TOP LIFTS (CREW TOTAL)
        </Text>
        <View className="gap-2.5">
          {topLifts.map((lift, index) => (
            <View key={lift.exerciseId} className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: index === 0 ? `${colors.brand.yellow}26` : `${colors.neutral.textSecondary}1a` }}
              >
                <Ionicons name={lift.icon} size={16} color={index === 0 ? colors.brand.yellow : colors.neutral.textSecondary} />
              </View>
              <Text className="body-md flex-1 font-body-semibold text-text-primary">{lift.exerciseName}</Text>
              <Text className="body-md font-body-bold text-brand-yellow">{lift.volume.toLocaleString("en-US")} KG</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(320).springify().damping(16).mass(0.6)}
        className="gap-3 rounded-2xl border border-divider bg-surface p-4"
      >
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="trophy" size={14} color={colors.brand.yellow} />
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
            TOP CONTRIBUTORS
          </Text>
        </View>
        <ContributorsList contributors={topContributors} unit="kg" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(380).springify().damping(16).mass(0.6)} className="flex-row gap-3">
        <View className="flex-1 gap-3 rounded-2xl border border-divider bg-surface p-4">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 16 }} className="text-text-primary">
            MUSCLE SPLIT
          </Text>
          {muscleSplit.length === 0 ? (
            <Text className="body-sm text-text-secondary">No sets logged this week yet.</Text>
          ) : (
            <SegmentedProportionBar segments={muscleSplit} />
          )}
        </View>

        <View className="flex-1 gap-3 rounded-2xl border border-divider bg-surface p-4">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 16 }} className="text-text-primary">
            WEEKLY ACTIVITY
          </Text>
          <HorizontalBarChart items={weeklyActivity} />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(440).springify().damping(16).mass(0.6)}
        className="gap-3 rounded-2xl border border-divider bg-surface p-4"
      >
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
          EXPLORE ANY LIFT
        </Text>
        <SearchableSelectField
          label="Exercise"
          value={selectedExercise.exerciseName}
          options={TRACKABLE_EXERCISES.map((exercise) => exercise.exerciseName)}
          onChange={(name) => {
            const match = TRACKABLE_EXERCISES.find((exercise) => exercise.exerciseName === name);
            if (match) setSelectedExerciseId(match.exerciseId);
          }}
        />
        <StrengthProgressChart exerciseName={selectedExercise.exerciseName} points={selectedTrend} title="Crew Volume" unit="kg" />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(500).springify().damping(16).mass(0.6)}
        className="gap-3 rounded-2xl border border-divider bg-surface p-4"
      >
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 18 }} className="text-text-primary">
          DIVISION TIMELINE
        </Text>
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
      </Animated.View>
    </View>
  );
}
