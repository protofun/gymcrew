import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { fromDateKey } from "@/lib/date";
import { DIVISION_COLOR, xpRequiredFor } from "@/lib/division";
import { buildLiftRankCards, overallPowerScore, highestTier } from "@/lib/lift-rank-cards";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, MAJOR_LIFT_EXERCISE_IDS } from "@/lib/rank";
import { computeCurrentStreak, computeLongestStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { kgToLbs } from "@/lib/units";
import { bestWeek, muscleTrainingBreakdown, workoutTotals } from "@/lib/workout-charts";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useBodyLogStore } from "@/store/body-log-store";
import type { WeightUnit } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

function formatWeight(kg: number, unit: WeightUnit): string {
  return unit === "kg" ? `${Math.round(kg)} kg` : `${Math.round(kgToLbs(kg))} lbs`;
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatWeekLabel(weekKey: string): string {
  return `Week of ${fromDateKey(weekKey).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

type StatGroup = { title: string; rows: { label: string; value: string; color?: string }[] };

export default function AllStatsScreen() {
  const insets = useSafeAreaInsets();

  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const records = usePersonalRecordsStore((state) => state.records);
  const bodyLogEntries = useBodyLogStore((state) => state.entries);
  const xp = useProfileLevelStore((state) => state.xp);
  const division = useProfileLevelStore((state) => state.division);
  const crew = useCrewStore((state) => state);

  const totals = useMemo(() => workoutTotals(workouts), [workouts]);
  const { most, least } = useMemo(() => muscleTrainingBreakdown(workouts), [workouts]);
  const best = useMemo(() => bestWeek(workouts), [workouts]);
  const currentStreak = computeCurrentStreak(workouts);
  const longestStreak = computeLongestStreak(workouts);
  const workoutsThisWeek = computeTrainedDaysThisWeek(workouts).filter(Boolean).length;

  const cards = useMemo(
    () => buildLiftRankCards(records, { gender: onboarding.gender ?? "male", bodyWeightKg: onboarding.weightKg ?? 85, age: onboarding.age }, "gym"),
    [records, onboarding.gender, onboarding.weightKg, onboarding.age],
  );
  const powerScore = overallPowerScore(cards);
  const topTier = highestTier(cards);

  const prList = Object.values(records);
  const mostRecentPr = prList.length > 0 ? prList.reduce((latest, pr) => (pr.achievedAt > latest.achievedAt ? pr : latest)) : null;

  const sortedBodyLogAsc = [...bodyLogEntries].sort((a, b) => a.loggedAt - b.loggedAt);
  const startingWeightKg = sortedBodyLogAsc[0]?.weightKg ?? onboarding.weightKg;
  const currentWeightKg = sortedBodyLogAsc[sortedBodyLogAsc.length - 1]?.weightKg ?? onboarding.weightKg;
  const weightChangeKg = currentWeightKg - startingWeightKg;
  const latestBodyFat = [...bodyLogEntries].sort((a, b) => b.loggedAt - a.loggedAt).find((entry) => entry.bodyFatPercent !== null)?.bodyFatPercent;

  const firstWorkoutAt = workouts.length > 0 ? Math.min(...workouts.map((workout) => workout.completedAt)) : Date.now();
  const weeksSinceFirstWorkout = Math.max(1, Math.round((Date.now() - firstWorkoutAt) / (7 * 86400000)));
  const avgWorkoutsPerWeek = (totals.workouts / weeksSinceFirstWorkout).toFixed(1);

  const me = crew.members.find((member) => member.id === CURRENT_MEMBER_ID);

  const groups: StatGroup[] = [
    {
      title: "Training",
      rows: [
        { label: "Total Workouts", value: String(totals.workouts) },
        { label: "Total Sets", value: totals.sets.toLocaleString("en-US") },
        { label: "Total Reps", value: totals.reps.toLocaleString("en-US") },
        { label: "Total Volume Lifted", value: formatWeight(totals.volumeKg, weightUnit) },
        { label: "Total Training Time", value: formatDuration(totals.durationSeconds) },
        { label: "Avg Workout Duration", value: formatDuration(totals.avgDurationSeconds) },
        { label: "Current Streak", value: `${currentStreak} day${currentStreak === 1 ? "" : "s"}`, color: currentStreak > 0 ? colors.semantic.streak : undefined },
        { label: "Longest Streak", value: `${longestStreak} day${longestStreak === 1 ? "" : "s"}` },
        { label: "Workouts This Week", value: `${workoutsThisWeek} / 7` },
        { label: "Avg Workouts / Week", value: avgWorkoutsPerWeek },
        { label: "Most Trained Muscle", value: most ? formatMuscleLabel(most) : "—", color: most ? colors.semantic.success : undefined },
        { label: "Least Trained Muscle", value: least ? formatMuscleLabel(least) : "—", color: least ? colors.semantic.error : undefined },
        { label: "Best Week (Volume)", value: best ? `${formatWeekLabel(best.weekKey)} · ${formatWeight(best.volumeKg, weightUnit)}` : "—" },
      ],
    },
    {
      title: "Personal Records",
      rows: [
        { label: "Total PRs Logged", value: String(prList.length) },
        { label: "Bench Press", value: records[MAJOR_LIFT_EXERCISE_IDS.benchPress] ? formatWeight(records[MAJOR_LIFT_EXERCISE_IDS.benchPress].bestWeightKg, weightUnit) : "—" },
        { label: "Squat", value: records[MAJOR_LIFT_EXERCISE_IDS.squat] ? formatWeight(records[MAJOR_LIFT_EXERCISE_IDS.squat].bestWeightKg, weightUnit) : "—" },
        { label: "Deadlift", value: records[MAJOR_LIFT_EXERCISE_IDS.deadlift] ? formatWeight(records[MAJOR_LIFT_EXERCISE_IDS.deadlift].bestWeightKg, weightUnit) : "—" },
        { label: "Overhead Press", value: records[MAJOR_LIFT_EXERCISE_IDS.overheadPress] ? formatWeight(records[MAJOR_LIFT_EXERCISE_IDS.overheadPress].bestWeightKg, weightUnit) : "—" },
        {
          label: "Most Recent PR",
          value: mostRecentPr ? `${mostRecentPr.exerciseName} · ${new Date(mostRecentPr.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—",
        },
      ],
    },
    {
      title: "Rank & Progress",
      rows: [
        { label: "Power Score", value: powerScore.toLocaleString("en-US"), color: colors.brand.yellow },
        { label: "Highest Tier Reached", value: formatRankTier(topTier) },
        { label: "Current Division", value: division, color: DIVISION_COLOR[division] },
        { label: "Total XP Earned", value: xp.toLocaleString("en-US") },
        { label: "XP To Next Division", value: Math.max(0, xpRequiredFor(division) - xp).toLocaleString("en-US") },
      ],
    },
    {
      title: "Body",
      rows: [
        { label: "Current Weight", value: formatWeight(currentWeightKg, weightUnit) },
        { label: "Starting Weight", value: formatWeight(startingWeightKg, weightUnit) },
        {
          label: "Weight Change",
          value: `${weightChangeKg >= 0 ? "+" : ""}${formatWeight(weightChangeKg, weightUnit)}`,
          color: weightChangeKg === 0 ? undefined : weightChangeKg > 0 ? colors.semantic.success : colors.semantic.error,
        },
        { label: "Body Fat %", value: latestBodyFat != null ? `${latestBodyFat}%` : "—" },
        { label: "Height", value: onboarding.heightCm ? `${onboarding.heightCm} cm` : "—" },
        { label: "Age", value: onboarding.age ? String(onboarding.age) : "—" },
        { label: "Gender", value: onboarding.gender === "male" ? "Male" : "Female" },
        { label: "Home Gym", value: onboarding.gymName || "—" },
        { label: "Goal", value: onboarding.goal || "—" },
        { label: "Experience Level", value: onboarding.experienceLevel || "—" },
      ],
    },
    {
      title: "Crew",
      rows: [
        { label: "Crew Name", value: crew.name || "—" },
        { label: "Crew Division", value: crew.division, color: DIVISION_COLOR[crew.division] },
        { label: "Crew Power", value: crew.crewPower.toLocaleString("en-US") },
        { label: "Members", value: `${crew.members.length} / ${crew.maxMembers}` },
        { label: "Your Role", value: me ? me.role.charAt(0).toUpperCase() + me.role.slice(1) : "—" },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">All Stats</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <View key={group.title} className="gap-2">
            <StatSectionHeader label={group.title} />
            <StatCard>
              {group.rows.map((row, index) => (
                <StatRow key={row.label} label={row.label} value={row.value} valueColor={row.color} isLast={index === group.rows.length - 1} />
              ))}
            </StatCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
