import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { AvatarStack } from "@/components/AvatarStack";
import { ChallengesTab } from "@/components/ChallengesTab";
import { CrewActivitySheet } from "@/components/CrewActivitySheet";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { DivisionBadge } from "@/components/DivisionBadge";
import { GoalRing } from "@/components/GoalRing";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { StatsTab } from "@/components/StatsTab";
import { TodayWorkoutModal } from "@/components/TodayWorkoutModal";
import { exerciseImages, rankTierImages } from "@/constants/images";
import { WORKOUT_NAME_HERO_IMAGE } from "@/data/workout-templates";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { mostRecentCrewAchievement } from "@/lib/crew-achievements";
import { crewMuscleBalance } from "@/lib/crew-muscle-balance";
import { nextDivision, xpRequiredFor } from "@/lib/division";
import { intensityToRedGreenColor } from "@/lib/muscle-groups";
import { formatRankTier } from "@/lib/rank";
import { formatShortAgo } from "@/lib/time-since";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const TABS = ["Overview", "Challenges", "Stats", "Settings"] as const;
type CrewTab = (typeof TABS)[number];

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style`
// onto native when combined with a sibling className (see TopBar's wordmarkStyle).
const crewNameStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 40,
  lineHeight: 42,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style`
// onto native when combined with a sibling className (see TopBar's wordmarkStyle).
const overviewHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const AVATAR_SIZE = 92;
const AVATAR_RING_PADDING = 3;

const avatarGlow = Platform.select({
  ios: { shadowColor: colors.brand.yellow, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  default: { elevation: 10 },
});

function InfoChip({ icon, label, tint }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-surface px-2.5 py-1">
      <Ionicons name={icon} size={11} color={tint} />
      <Text className="caption font-body-semibold" style={{ color: tint }}>
        {label}
      </Text>
    </View>
  );
}

function CrewBanner() {
  const name = useCrewStore((state) => state.name);
  const tagline = useCrewStore((state) => state.tagline);
  const icon = useCrewStore((state) => state.icon);
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
  const division = useCrewStore((state) => state.division);

  return (
    <View className="px-4 pt-4">
      <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1.5 }}>
        YOUR CREW
      </Text>

      <View className="mt-3 flex-row items-center gap-3">
        <Animated.View
          entering={ZoomIn.springify().damping(12).mass(0.6)}
          style={[
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              padding: AVATAR_RING_PADDING,
              backgroundColor: colors.brand.yellow,
            },
            avatarGlow,
          ]}
        >
          <View className="flex-1 overflow-hidden rounded-full border-2 border-background">
            <CrewIconBadge iconKey={icon} size={AVATAR_SIZE - AVATAR_RING_PADDING * 2 - 4} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify().damping(14).mass(0.6)} className="flex-1 gap-2">
          <Text style={crewNameStyle} className="text-brand-white" numberOfLines={2}>
            {name.toUpperCase()}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2">
            <InfoChip icon="shield" label={division} tint={colors.brand.yellow} />
            <InfoChip icon="people" label={`${members.length}/${maxMembers}`} tint={colors.neutral.textSecondary} />
          </View>
        </Animated.View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="body-md text-text-secondary">{tagline}</Text>

        <Pressable
          onPress={() => router.push("/crew/settings")}
          hitSlop={8}
          style={PRESSED_STYLE}
          className="h-8 w-8 items-center justify-center rounded-full border border-divider"
        >
          <Ionicons name="settings-outline" size={16} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function CrewTopTabs({ active, onChange }: { active: CrewTab; onChange: (tab: CrewTab) => void }) {
  return (
    <View className="mx-4 mt-4 flex-row rounded-full border border-divider bg-surface p-1">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => (tab === "Settings" ? router.push("/crew/settings") : onChange(tab))}
            className={`flex-1 items-center rounded-full py-2 ${isActive ? "bg-brand-yellow" : ""}`}
          >
            <Text className={`caption font-body-semibold ${isActive ? "text-brand-iron" : "text-text-secondary"}`}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OverviewHeader() {
  return (
    <View className="mx-4 mt-4 gap-1">
      <Text style={overviewHeaderStyle} className="text-brand-white">
        CREW HQ
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="flash" size={13} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-text-secondary">Where the crew&apos;s grind adds up.</Text>
      </View>
    </View>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <View className="mx-4 mt-10 items-center gap-2 rounded-3xl border border-divider bg-surface px-6 py-10">
      <Ionicons name="hourglass-outline" size={28} color={colors.neutral.textSecondary} />
      <Text className="body-md font-body-semibold text-text-primary">{label} coming soon</Text>
      <Text className="body-sm text-center text-text-secondary">This tab isn&apos;t built yet — check back soon.</Text>
    </View>
  );
}

function IconBadge({ icon, tint }: { icon: keyof typeof Ionicons.glyphMap; tint: string }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}26` }}>
      <Ionicons name={icon} size={17} color={tint} />
    </View>
  );
}

function LiveDot() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 700 })), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 2 - pulse.value }));

  return (
    <View className="h-2 w-2 items-center justify-center">
      <Animated.View
        style={[{ position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: colors.semantic.streak }, pulseStyle]}
      />
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.semantic.streak }} />
    </View>
  );
}

function DivisionRankCard() {
  const division = useCrewStore((state) => state.division);
  const globalRank = useCrewStore((state) => state.globalRank);
  const region = useCrewStore((state) => state.region);
  const xp = useCrewStore((state) => state.xp);
  const xpNeeded = xpRequiredFor(division);
  const next = nextDivision(division);
  const ratio = Number.isFinite(xpNeeded) ? xp / xpNeeded : 1;

  return (
    <Animated.View
      entering={FadeInUp.delay(150).springify().damping(16).mass(0.6)}
      className="relative mx-4 mt-6 gap-4 rounded-3xl border border-divider bg-surface p-4"
    >
      <View className="flex-row items-center gap-4">
        <Pressable onPress={() => router.push("/crew/division")} style={PRESSED_STYLE}>
          <GoalRing ratio={ratio} color={colors.brand.yellow} size={82} strokeWidth={5}>
            <DivisionBadge division={division} size={56} />
          </GoalRing>
        </Pressable>

        <View className="flex-1 gap-2.5">
          <Pressable onPress={() => router.push("/crew/division")} style={PRESSED_STYLE} className="gap-0.5">
            <View className="flex-row items-center gap-1">
              <Text className="caption text-text-secondary">DIVISION</Text>
              <Ionicons name="chevron-forward" size={11} color={colors.neutral.textSecondary} />
            </View>
            <Text className="heading-3 text-brand-yellow">{division}</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/crew/leaderboard")} style={PRESSED_STYLE} className="flex-row items-center gap-1">
            <Ionicons name="podium-outline" size={13} color={colors.neutral.textSecondary} />
            <Text className="caption font-body-semibold text-text-primary">#{globalRank}</Text>
            <Text className="caption text-text-secondary">in {region}</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="caption text-text-secondary">{next ? `Progress to ${next}` : "Top division reached"}</Text>
          {next && (
            <Text className="caption font-body-semibold text-text-primary">
              {xp.toLocaleString("en-US")} / {xpNeeded.toLocaleString("en-US")} XP
            </Text>
          )}
        </View>
        <ProgressBar ratio={ratio} color={colors.brand.yellow} height={8} />
      </View>
    </Animated.View>
  );
}

function CrewPowerCard() {
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewPowerChangePercent = useCrewStore((state) => state.crewPowerChangePercent);

  return (
    <Animated.View entering={FadeInUp.delay(220).springify().damping(16).mass(0.6)} className="flex-1">
      <Pressable
        onPress={() => router.push("/crew/leaderboard")}
        style={PRESSED_STYLE}
        className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-4"
      >
        <View className="flex-row items-center justify-between">
          <IconBadge icon="flash" tint={colors.brand.yellow} />
          <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
        </View>

        <Text className="caption font-body-semibold text-text-secondary">CREW POWER</Text>
        <Text className="heading-3 text-text-primary">{crewPower.toLocaleString("en-US")}</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="trending-up" size={13} color={colors.semantic.success} />
          <Text className="caption font-body-semibold" style={{ color: colors.semantic.success }}>
            {crewPowerChangePercent}% vs last week
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MembersCard() {
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);

  return (
    <Animated.View entering={FadeInUp.delay(280).springify().damping(16).mass(0.6)} className="flex-1">
      <Pressable
        onPress={() => router.push("/crew/members")}
        style={PRESSED_STYLE}
        className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-4"
      >
        <View className="flex-row items-center justify-between">
          <IconBadge icon="people" tint={colors.semantic.info} />
          <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
        </View>

        <Text className="caption font-body-semibold text-text-secondary">MEMBERS</Text>
        <Text className="heading-3 text-text-primary">
          {members.length}/{maxMembers}
        </Text>
        <AvatarStack avatarUrls={members.map((member) => member.avatarUrl)} />
      </Pressable>
    </Animated.View>
  );
}

function TodayPlanCard({ onPress }: { onPress: () => void }) {
  const members = useCrewStore((state) => state.members);
  const todayPlan = useCrewStore((state) => state.todayPlan);
  const today = useTodayWorkout();
  const workoutName = today.workoutName;
  const trainingAvatars = todayPlan.memberIdsTraining
    .map((id) => members.find((member) => member.id === id)?.avatarUrl)
    .filter((url): url is string => Boolean(url));
  const trainingCount = todayPlan.memberIdsTraining.length;
  const heroImage = WORKOUT_NAME_HERO_IMAGE[workoutName] ?? exerciseImages.benchPress;

  return (
    <Animated.View entering={FadeInUp.delay(340).springify().damping(16).mass(0.6)} className="mx-4 mt-3">
      <Pressable
        onPress={onPress}
        style={PRESSED_STYLE}
        className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
      >
        <Image source={heroImage} resizeMode="cover" className="rounded-xl bg-background" style={{ width: 64, height: 64 }} />

        <View className="flex-1 gap-1">
          <Text className="caption font-body-semibold text-text-secondary">TODAY&apos;S PLAN</Text>
          <Text className="heading-4 text-text-primary">{workoutName}</Text>
          {trainingCount > 0 && (
            <View className="flex-row items-center gap-1.5">
              <LiveDot />
              <Text className="body-sm text-text-secondary">{trainingCount} members training now</Text>
            </View>
          )}
        </View>

        <View className="items-end gap-2">
          <AvatarStack avatarUrls={trainingAvatars} />
          <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MuscleBalanceCard() {
  const members = useCrewStore((state) => state.members);
  const myWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const muscleIntensity = crewMuscleBalance(members, myWorkouts);

  return (
    <Animated.View
      entering={FadeInUp.delay(400).springify().damping(16).mass(0.6)}
      className="mx-4 mt-3 gap-4 rounded-2xl border border-divider bg-surface p-4"
    >
      <View>
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          MUSCLE BALANCE (CREW)
        </Text>
        <Text className="caption text-text-secondary">This week, across all {members.length} members</Text>
      </View>

      <MuscleHeatmap muscleIntensity={muscleIntensity} height={220} showLegend={false} colorForIntensity={intensityToRedGreenColor} />

      <View className="gap-1.5">
        {/* No native linear-gradient view here, so the scale is approximated with evenly spaced
            solid bands matching the same red-green function the body silhouette uses. */}
        <View className="flex-row overflow-hidden rounded-full" style={{ height: 10 }}>
          {Array.from({ length: 20 }).map((_, index) => (
            <View key={index} className="flex-1" style={{ backgroundColor: intensityToRedGreenColor((index / 19) * 10) }} />
          ))}
        </View>
        <View className="flex-row justify-between">
          <Text className="caption text-text-secondary">LOW</Text>
          <Text className="caption text-text-secondary">HIGH</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function RecentAchievementCard() {
  const members = useCrewStore((state) => state.members);
  const myRecords = usePersonalRecordsStore((state) => state.records);
  const myGender = useOnboardingStore((state) => state.onboarding.gender);
  const myWeightKg = useOnboardingStore((state) => state.onboarding.weightKg);

  const result = mostRecentCrewAchievement(members, myRecords, myGender, myWeightKg);
  if (!result) return null;

  const { member, achievement, rankTier } = result;
  const isMe = member.id === CURRENT_MEMBER_ID;
  const achievedDate = new Date(achievement.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Animated.View
      entering={FadeInUp.delay(460).springify().damping(16).mass(0.6)}
      className="mx-4 mt-3 gap-3 rounded-2xl border border-divider bg-surface p-4"
    >
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="trophy" size={13} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          RECENT ACHIEVEMENT
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="items-center gap-1">
          <Image source={rankTierImages[rankTier]} resizeMode="contain" style={{ width: 44, height: 44 }} />
          <Text className="caption font-body-bold text-brand-yellow">{formatRankTier(rankTier)}</Text>
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="body-md font-body-bold text-text-primary">{isMe ? "You" : member.name}</Text>
          <Text className="body-sm text-text-secondary">
            {achievement.exerciseName} PR · {achievement.weightKg} kg × {achievement.reps} reps
          </Text>
          <Text className="caption text-text-secondary">
            {achievedDate} · {formatShortAgo(achievement.achievedAt)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function CrewScreen() {
  const [activeTab, setActiveTab] = useState<CrewTab>("Overview");
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [todayModalOpen, setTodayModalOpen] = useState(false);

  const session = useLedWorkoutStore((state) => state.session);
  const hasWorkoutInProgress = useActiveWorkoutStore((state) => state.startedAt !== null);
  const setTodayOverride = useTodayTrainingStore((state) => state.setTodayOverride);
  const clearTodayOverride = useTodayTrainingStore((state) => state.clearTodayOverride);
  const today = useTodayWorkout();

  const iAmLeader = session?.leaderId === CURRENT_MEMBER_ID;
  const iHaveJoined = session?.participantIds.includes(CURRENT_MEMBER_ID) ?? false;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <CrewBanner />
      <CrewTopTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" ? (
        <>
          <OverviewHeader />
          <DivisionRankCard />
          <View className="mx-4 mt-3 flex-row items-stretch gap-3">
            <CrewPowerCard />
            <MembersCard />
          </View>
          <TodayPlanCard onPress={() => setActivitySheetOpen(true)} />
          <RecentAchievementCard />
          <MuscleBalanceCard />
        </>
      ) : activeTab === "Challenges" ? (
        <ChallengesTab />
      ) : activeTab === "Stats" ? (
        <StatsTab />
      ) : (
        <ComingSoon label={activeTab} />
      )}

      <CrewActivitySheet
        visible={activitySheetOpen}
        onClose={() => setActivitySheetOpen(false)}
        session={session}
        iAmLeader={iAmLeader}
        iHaveJoined={iHaveJoined}
        hasWorkoutInProgress={hasWorkoutInProgress}
        onContinueWorkout={() => {
          setActivitySheetOpen(false);
          router.push("/workout/active");
        }}
        onJoinWorkout={() => {
          setActivitySheetOpen(false);
          router.push("/crew/join-workout");
        }}
        onLeadWorkout={() => {
          setActivitySheetOpen(false);
          router.push("/crew/lead-workout");
        }}
        onSoloWorkout={() => {
          setActivitySheetOpen(false);
          router.push("/workout/templates");
        }}
        onSetTodaysTraining={() => {
          setActivitySheetOpen(false);
          setTodayModalOpen(true);
        }}
      />

      <TodayWorkoutModal
        visible={todayModalOpen}
        onClose={() => setTodayModalOpen(false)}
        isOverridden={today.isOverridden}
        onSave={(name) => setTodayOverride(name)}
        onClearOverride={clearTodayOverride}
      />
    </ScrollView>
  );
}
