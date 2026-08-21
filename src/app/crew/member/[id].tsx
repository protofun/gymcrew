import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementRow } from "@/components/AchievementRow";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { EXERCISE_BY_ID, type Exercise } from "@/data/exercises";
import { generateMemberWorkoutSessions, type MuscleGroup } from "@/data/workout-log";
import { memberLiftCards } from "@/lib/crew-lift-compare";
import { fromDateKey, getMonthGrid, isSameMonth, startOfMonth, toDateKey } from "@/lib/date";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { memberAchievements, memberStats, memberStrengthProgress, memberXp } from "@/lib/member-mock-profile";
import { realMemberAchievements, realMemberStats, realStrengthProgress } from "@/lib/member-real-profile";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatRankTier, MAJOR_LIFT_EXERCISE_IDS, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { CURRENT_MEMBER_ID, useCrewStore, type CrewMember, type CrewRole } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const TABS = ["Overview", "Workouts", "Stats", "Achievements"] as const;
type Tab = (typeof TABS)[number];

const ROLE_LABEL: Record<CrewRole, string | null> = { leader: "Leader", "co-leader": "Co-Leader", member: null };

type SimpleWorkoutEntry = { id: string; name: string; date: Date; subtitle: string; hasPr: boolean };

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View className="flex-row border-b border-divider px-2">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable key={tab} onPress={() => onChange(tab)} className="flex-1 items-center gap-2 py-3">
            <Text className={`body-sm font-body-semibold ${isActive ? "text-brand-yellow" : "text-text-secondary"}`}>
              {tab}
            </Text>
            <View className={`h-0.5 w-full rounded-full ${isActive ? "bg-brand-yellow" : "bg-transparent"}`} />
          </Pressable>
        );
      })}
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text className="heading-4 text-text-primary">{value}</Text>
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

function OverviewTab({
  member,
  stats,
  achievements,
  onSeeAllAchievements,
}: {
  member: CrewMember;
  stats: { workoutsCount: number; volumeKg: number; prsCount: number };
  achievements: ReturnType<typeof memberAchievements>;
  onSeeAllAchievements: () => void;
}) {
  const { xp, xpToNextLevel } = memberXp(member);
  const roleLabel = ROLE_LABEL[member.role];

  return (
    <View className="gap-5 p-4">
      <View className="items-center gap-2">
        <View
          className="overflow-hidden rounded-full border-2 border-brand-yellow"
          style={{ width: 88, height: 88 }}
        >
          <Image source={{ uri: member.avatarUrl }} className="bg-divider" style={{ width: "100%", height: "100%" }} />
        </View>
        <Text className="heading-4 text-text-primary">{member.name}</Text>
        <Text className="body-sm text-text-secondary">@{member.username}</Text>
        {roleLabel && (
          <View className="rounded-full bg-surface px-2.5 py-1">
            <Text className="caption font-body-semibold text-brand-yellow">{roleLabel}</Text>
          </View>
        )}
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="caption font-body-semibold text-text-secondary">LVL {member.level}</Text>
          <Text className="caption text-text-secondary">
            {xp.toLocaleString("en-US")} / {xpToNextLevel.toLocaleString("en-US")} XP
          </Text>
        </View>
        <ProgressBar ratio={xp / xpToNextLevel} color={colors.brand.yellow} height={8} />
      </View>

      <View className="flex-row items-center rounded-2xl border border-divider bg-surface p-4">
        <StatTile label="Workouts" value={String(stats.workoutsCount)} />
        <View className="h-8 w-px bg-divider" />
        <StatTile label="Volume" value={`${stats.volumeKg.toLocaleString("en-US")} kg`} />
        <View className="h-8 w-px bg-divider" />
        <StatTile label="PRs" value={String(stats.prsCount)} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="body-md font-body-semibold text-text-primary">Recent Achievements</Text>
          {achievements.length > 2 && (
            <Pressable onPress={onSeeAllAchievements} hitSlop={6}>
              <Text className="caption font-body-semibold text-brand-yellow">See all</Text>
            </Pressable>
          )}
        </View>

        {achievements.length === 0 ? (
          <Text className="body-sm text-text-secondary">No achievements yet.</Text>
        ) : (
          <View className="gap-2.5">
            {achievements.slice(0, 2).map((achievement) => (
              <AchievementRow key={achievement.id} achievement={achievement} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function WorkoutsTab({ entries }: { entries: SimpleWorkoutEntry[] }) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const weeks = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const isCurrentMonth = isSameMonth(visibleMonth, today);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, SimpleWorkoutEntry[]>();
    for (const entry of entries) {
      const key = toDateKey(entry.date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [entries]);

  const monthEntries = entries
    .filter((entry) => isSameMonth(entry.date, visibleMonth))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <View className="gap-4 p-4">
      <View className="gap-3 rounded-3xl border border-divider bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral.textSecondary} />
          </Pressable>
          <Text className="body-md font-body-semibold text-text-primary">
            {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <Pressable
            onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            hitSlop={8}
            disabled={isCurrentMonth}
          >
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-row justify-between">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <Text key={label} className="caption flex-1 text-center text-text-secondary">
              {label}
            </Text>
          ))}
        </View>

        <View className="gap-1">
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row">
              {week.map((date, dayIndex) => {
                if (!date) return <View key={dayIndex} className="flex-1" />;
                const isTrained = entriesByDay.has(toDateKey(date));
                return (
                  <View key={dayIndex} className="flex-1 items-center py-1">
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-full ${isTrained ? "bg-brand-yellow" : ""}`}
                    >
                      <Text className={`body-sm ${isTrained ? "font-body-semibold text-brand-iron" : "text-text-primary"}`}>
                        {date.getDate()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2.5">
        {monthEntries.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="calendar-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No workouts this month</Text>
          </View>
        ) : (
          monthEntries.map((entry) => (
            <View key={entry.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                <Ionicons
                  name={entry.hasPr ? "trophy" : "barbell-outline"}
                  size={18}
                  color={entry.hasPr ? colors.brand.yellow : colors.neutral.textSecondary}
                />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="body-md font-body-semibold text-text-primary">{entry.name}</Text>
                <Text className="caption text-text-secondary">
                  {entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {entry.subtitle}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function StatsTab({
  memberId,
  muscleRanks,
  selectedExerciseName,
  onOpenExercisePicker,
  strengthPoints,
}: {
  memberId: string;
  muscleRanks: Partial<Record<MuscleGroup, MuscleGroupRank>>;
  selectedExerciseName: string;
  onOpenExercisePicker: () => void;
  strengthPoints: { date: string; value: number }[];
}) {
  const rankedEntries = (Object.entries(muscleRanks) as [MuscleGroup, MuscleGroupRank][]).filter(
    (entry): entry is [MuscleGroup, Extract<MuscleGroupRank, { status: "ranked" }>] => entry[1]?.status === "ranked",
  );
  const muscleTierIndex: Partial<Record<MuscleGroup, number>> = Object.fromEntries(
    rankedEntries.map(([group, rank]) => [group, rank.tierIndex]),
  );
  // One badge per tier actually reached, not one per muscle — several muscles can share the same
  // tier, so repeating it per muscle was just noise.
  const distinctTiers = [...new Set(rankedEntries.map(([, rank]) => rank.tier))].sort(
    (a, b) => RANK_TIERS.indexOf(b) - RANK_TIERS.indexOf(a),
  );

  return (
    <View className="gap-6 p-4">
      <View className="gap-3">
        <Text className="body-md font-body-semibold text-text-primary">Muscle Rank</Text>
        {distinctTiers.length === 0 ? (
          <Text className="body-sm text-text-secondary">Log a bench, squat, deadlift, or overhead press to see ranks here.</Text>
        ) : (
          <>
            <MuscleHeatmap
              muscleIntensity={muscleTierIndex}
              height={220}
              showLegend={false}
              colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
            />
            <View className="flex-row flex-wrap justify-center gap-4">
              {distinctTiers.map((tier) => (
                <View key={tier} className="items-center gap-1">
                  <RankBadge tier={tier} size={48} />
                  <Text className="body-sm font-body-bold" style={{ color: RANK_TIER_COLOR[tier] }}>
                    {formatRankTier(tier)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.push(`/ranks/body-graph?memberId=${memberId}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          className="flex-row items-center justify-center gap-2 rounded-full border border-divider py-3"
        >
          <Ionicons name="body-outline" size={15} color={colors.brand.yellow} />
          <Text className="body-sm font-body-semibold text-brand-yellow">View Full Muscle Rank</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        <Text className="body-md font-body-semibold text-text-primary">Exercise Progress</Text>
        <Pressable
          onPress={onOpenExercisePicker}
          className="flex-row items-center justify-between rounded-xl border border-divider bg-surface px-4 py-4"
        >
          <Text className="body-md text-text-primary">{selectedExerciseName}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.neutral.textSecondary} />
        </Pressable>
        <StrengthProgressChart exerciseName={selectedExerciseName} points={strengthPoints} />
      </View>
    </View>
  );
}

function AchievementsTab({ achievements }: { achievements: ReturnType<typeof memberAchievements> }) {
  return (
    <View className="gap-2.5 p-4">
      {achievements.length === 0 ? (
        <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
          <Ionicons name="trophy-outline" size={28} color={colors.neutral.textSecondary} />
          <Text className="body-md text-text-secondary">No achievements yet.</Text>
        </View>
      ) : (
        achievements.map((achievement) => <AchievementRow key={achievement.id} achievement={achievement} />)
      )}
    </View>
  );
}

export default function MemberProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("Overview");

  const members = useCrewStore((state) => state.members);
  const member = members.find((candidate) => candidate.id === id);
  const isMe = id === CURRENT_MEMBER_ID;

  const realWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const realRecords = usePersonalRecordsStore((state) => state.records);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);

  const mockSessions = useMemo(() => generateMemberWorkoutSessions(member?.id ?? id ?? "member"), [member?.id, id]);

  const stats = isMe ? realMemberStats(realWorkouts) : memberStats(mockSessions);
  const achievements = isMe ? realMemberAchievements(realRecords) : memberAchievements(mockSessions);
  const strengthByExercise = isMe ? realStrengthProgress(realWorkouts) : memberStrengthProgress(mockSessions);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const myCards = useMemo(() => buildLiftRankCards(realRecords, profile, "gym"), [realRecords, profile]);
  const muscleRanks = useMemo(() => {
    if (!member) return {};
    return computeMuscleGroupRanks(isMe ? myCards : memberLiftCards(member.id, myCards));
  }, [member, isMe, myCards]);

  const [selectedExercise, setSelectedExercise] = useState<Exercise>(() => EXERCISE_BY_ID[MAJOR_LIFT_EXERCISE_IDS.benchPress]);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  const workoutEntries: SimpleWorkoutEntry[] = isMe
    ? realWorkouts.map((workout) => ({
        id: workout.id,
        name: workout.name,
        date: new Date(workout.completedAt),
        subtitle: `${workout.completedSets} sets · ${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`,
        hasPr: workout.prs.length > 0,
      }))
    : Object.entries(mockSessions).map(([dateKey, session]) => ({
        id: dateKey,
        name: session.name,
        date: fromDateKey(dateKey),
        subtitle: `${session.exercises} exercises · ${session.volumeKg.toLocaleString("en-US")} kg`,
        hasPr: achievements.some((achievement) => achievement.id.endsWith(dateKey)),
      }));

  if (!member) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-text-secondary">This member could not be found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary" numberOfLines={1}>
          {member.name}&apos;s Profile
        </Text>
      </View>

      <TabBar active={tab} onChange={setTab} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {tab === "Overview" && (
          <OverviewTab member={member} stats={stats} achievements={achievements} onSeeAllAchievements={() => setTab("Achievements")} />
        )}
        {tab === "Workouts" && <WorkoutsTab entries={workoutEntries} />}
        {tab === "Stats" && (
          <StatsTab
            memberId={member?.id ?? id ?? ""}
            muscleRanks={muscleRanks}
            selectedExerciseName={selectedExercise.name}
            onOpenExercisePicker={() => setExercisePickerOpen(true)}
            strengthPoints={strengthByExercise[selectedExercise.name] ?? []}
          />
        )}
        {tab === "Achievements" && <AchievementsTab achievements={achievements} />}
      </ScrollView>

      <ExercisePickerModal
        visible={exercisePickerOpen}
        title="Exercise Progress"
        subtitle="Pick any exercise to see its strength progress."
        onClose={() => setExercisePickerOpen(false)}
        onSelect={(exercise) => {
          setSelectedExercise(exercise);
          setExercisePickerOpen(false);
        }}
        hideCreateRow
      />
    </View>
  );
}
