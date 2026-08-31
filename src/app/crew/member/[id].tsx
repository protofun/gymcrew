import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementRow } from "@/components/AchievementRow";
import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { EditableText } from "@/components/EditableText";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import { StatTile } from "@/components/StatTile";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { VisualTrainingCalendar, type CalendarWorkout } from "@/components/VisualTrainingCalendar";
import { EXERCISE_BY_ID, type Exercise } from "@/data/exercises";
import type { MuscleGroup } from "@/data/workout-log";
import { memberLiftCards, muscleGroupRanksForCrewMember, profileForCrewMember } from "@/lib/crew-lift-compare";
import { isSameMonth, startOfMonth } from "@/lib/date";
import { xpRequiredFor, type Division } from "@/lib/division";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards, type LiftRankCard } from "@/lib/lift-rank-cards";
import { memberAchievements } from "@/lib/member-mock-profile";
import { realMemberAchievements, realMemberStats, realStrengthProgress } from "@/lib/member-real-profile";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatRankTier, MAJOR_LIFT_EXERCISE_IDS, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import {
  BRO_MEMBER_ID,
  CURRENT_MEMBER_ID,
  GLUTE_ONLY_MEMBER_ID,
  LEE_PRIEST_MEMBER_ID,
  useCrewStore,
  type CrewMember,
  type CrewRole,
} from "@/store/crew-store";
import { useOnboardingStore, type Gender } from "@/store/onboarding-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

/** Real Clerk crew members never have one of these curated "boss" ids (see crew-store.ts) — only
 * an explicit Developer Mode demo tool would ever add one. Keeps the curated comparisons (Lee
 * Priest, Bro, Peach) working exactly as before; every real crewmate uses their real data below. */
function isCuratedMember(memberId: string): boolean {
  return memberId === LEE_PRIEST_MEMBER_ID || memberId === BRO_MEMBER_ID || memberId === GLUTE_ONLY_MEMBER_ID;
}

// Stable empty fallbacks — a fresh `{}`/`[]` literal on every render (before a crewmate's activity
// has loaded) would otherwise change identity each time and defeat the useMemo below.
const NO_WORKOUTS: CompletedWorkout[] = [];
const NO_RECORDS: Record<string, PersonalRecord> = {};

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

function OverviewTab({
  member,
  division,
  stats,
  achievements,
  onSeeAllAchievements,
}: {
  member: CrewMember;
  division: Division;
  stats: { workoutsCount: number; volumeKg: number; prsCount: number };
  achievements: ReturnType<typeof memberAchievements>;
  onSeeAllAchievements: () => void;
}) {
  // Real XP/division from the backend (see crew-store.ts's CrewMember doc comment) — `member.level`
  // is their real current-division XP, directly comparable to `xpRequiredFor`, same as "me" everywhere else.
  const xp = member.level;
  const xpToNextLevel = xpRequiredFor(division);
  const roleLabel = ROLE_LABEL[member.role];

  return (
    <View className="gap-5 p-4">
      <View className="items-center gap-2">
        <DivisionAvatarFrame source={{ uri: member.avatarUrl }} division={division} size={88} />
        <EditableText id={`crew.member.${member.id}.name`} className="heading-4 text-text-primary">
          {member.name}
        </EditableText>
        <EditableText id={`crew.member.${member.id}.username`} className="body-sm text-text-secondary">
          {`@${member.username}`}
        </EditableText>
        {roleLabel && (
          <View className="rounded-full bg-surface px-2.5 py-1">
            <Text className="caption font-body-semibold text-brand-yellow">{roleLabel}</Text>
          </View>
        )}
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <EditableText id={`crew.member.${member.id}.level`} className="caption font-body-semibold text-text-secondary">
            {`LVL ${member.level}`}
          </EditableText>
          <EditableText id={`crew.member.${member.id}.xpProgress`} className="caption text-text-secondary">
            {`${xp.toLocaleString("en-US")} / ${xpToNextLevel.toLocaleString("en-US")} XP`}
          </EditableText>
        </View>
        <ProgressBar ratio={xp / xpToNextLevel} color={colors.brand.yellow} height={8} />
      </View>

      <View className="flex-row gap-3">
        <StatTile id={`crew.member.${member.id}.stats.workouts`} icon="barbell" label="Workouts" value={String(stats.workoutsCount)} />
        <StatTile id={`crew.member.${member.id}.stats.volume`} icon="trending-up" label="Volume" value={`${stats.volumeKg.toLocaleString("en-US")} kg`} />
        <StatTile id={`crew.member.${member.id}.stats.prs`} icon="ribbon" label="PRs" value={String(stats.prsCount)} />
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

function WorkoutsTab({
  entries,
  calendarWorkouts,
  interactive,
  gender,
}: {
  entries: SimpleWorkoutEntry[];
  calendarWorkouts: CalendarWorkout[];
  interactive: boolean;
  gender: Gender;
}) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const isCurrentMonth = isSameMonth(visibleMonth, today);

  const monthEntries = entries
    .filter((entry) => isSameMonth(entry.date, visibleMonth))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <View className="gap-4 p-4">
      <VisualTrainingCalendar
        workouts={calendarWorkouts}
        interactive={interactive}
        footerNote={interactive ? "Each figure shows exactly what you trained that day" : "Each figure shows exactly what they trained that day"}
        gender={gender}
      />

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
  const myGender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const gender: Gender = memberId === CURRENT_MEMBER_ID ? myGender : "male";
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
              gender={gender}
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
  const isCurated = !isMe && Boolean(member) && isCuratedMember(member!.id);
  // Real division from the backend (see crew-store.ts's CrewMember doc comment) — never derived
  // from `level`, which is real total XP, not the old mock 1-30 "level" scale.
  const myDivision = useProfileLevelStore((state) => state.division);
  const memberDivision = isMe ? myDivision : (member?.division ?? "Rookie");

  const realWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const realRecords = usePersonalRecordsStore((state) => state.records);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const otherActivity = member ? membersActivity[member.id] : undefined;
  const otherWorkouts = otherActivity?.recentWorkouts ?? NO_WORKOUTS;
  const otherRecords = otherActivity?.records ?? NO_RECORDS;
  // A real crewmate's real gender/bodyweight (see backend/routes/crews.php) once it's loaded;
  // curated "boss" members keep their own fixed profile either way.
  const displayGender: Gender = isMe ? gender : (otherActivity?.profile.gender ?? "male");

  const stats = isMe ? realMemberStats(realWorkouts) : realMemberStats(otherWorkouts);
  const achievements = isMe ? realMemberAchievements(realRecords) : realMemberAchievements(otherRecords);
  const strengthByExercise = isMe ? realStrengthProgress(realWorkouts) : realStrengthProgress(otherWorkouts);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const otherProfile: RankProfile = useMemo(
    () => ({ gender: otherActivity?.profile.gender ?? "male", bodyWeightKg: otherActivity?.profile.weightKg ?? 85 }),
    [otherActivity],
  );
  const myCards = useMemo(() => buildLiftRankCards(realRecords, profile, "gym"), [realRecords, profile]);
  const otherCards = useMemo(() => buildLiftRankCards(otherRecords, otherProfile, "gym"), [otherRecords, otherProfile]);

  const muscleRanks = useMemo(() => {
    if (!member) return {};
    if (isMe) return computeMuscleGroupRanks(myCards);
    if (isCurated) return muscleGroupRanksForCrewMember(member.id, myCards, membersActivity);
    return computeMuscleGroupRanks(otherCards);
  }, [member, isMe, isCurated, myCards, otherCards, membersActivity]);

  // The exercise-picker medal below is the pictured member's own rank, not always mine — a real
  // crewmate's own real lift cards/profile/records, or the curated set for a "boss" comparison.
  const pickerCards: LiftRankCard[] = isMe ? myCards : isCurated ? memberLiftCards(member?.id ?? "", myCards, membersActivity) : otherCards;
  const pickerProfile = isMe ? profile : isCurated ? profileForCrewMember(member?.id ?? "") : otherProfile;
  const pickerRecords = isMe ? realRecords : isCurated ? {} : otherRecords;

  const [selectedExercise, setSelectedExercise] = useState<Exercise>(() => EXERCISE_BY_ID[MAJOR_LIFT_EXERCISE_IDS.benchPress]);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  const workoutsForEntries = isMe ? realWorkouts : otherWorkouts;
  const workoutEntries: SimpleWorkoutEntry[] = workoutsForEntries.map((workout) => ({
    id: workout.id,
    name: workout.name,
    date: new Date(workout.completedAt),
    subtitle: `${workout.completedSets} sets · ${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`,
    hasPr: workout.prs.length > 0,
  }));

  const calendarWorkouts: CalendarWorkout[] = workoutsForEntries;

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
        <EditableText id={`crew.member.${member.id}.headerTitle`} className="heading-4 text-text-primary" numberOfLines={1}>
          {`${member.name}'s Profile`}
        </EditableText>
      </View>

      <TabBar active={tab} onChange={setTab} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {tab === "Overview" && (
          <OverviewTab
            member={member}
            division={memberDivision}
            stats={stats}
            achievements={achievements}
            onSeeAllAchievements={() => setTab("Achievements")}
          />
        )}
        {tab === "Workouts" && (
          <WorkoutsTab entries={workoutEntries} calendarWorkouts={calendarWorkouts} interactive={isMe} gender={displayGender} />
        )}
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
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, pickerCards, pickerRecords, pickerProfile)} size={34} />}
      />
    </View>
  );
}
