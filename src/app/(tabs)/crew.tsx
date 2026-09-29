import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";
import { AttachStep } from "react-native-spotlight-tour";

import { ATTACH_INDEXES } from "@/components/AppTourOverlay";
import { ChallengesTab } from "@/components/ChallengesTab";
import { CrewActivitySheet } from "@/components/CrewActivitySheet";
import { CrewCarousel } from "@/components/CrewCarousel";
import { CrewEventReactionBar } from "@/components/CrewEventReactionBar";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { CrewLeagueRecapCard } from "@/components/CrewLeagueRecapCard";
import { CrewLeagueTab } from "@/components/CrewLeagueTab";
import { CrewRivalsTab } from "@/components/CrewRivalsTab";
import { CrewWarRecapCard } from "@/components/CrewWarRecapCard";
import { CrewWarTab } from "@/components/CrewWarTab";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { HOME_ACCENT, HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { HomeReveal } from "@/components/HomeReveal";
import { HomeRow } from "@/components/HomeRow";
import { HomeRowLead } from "@/components/HomeRowLead";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { PromoBanners } from "@/components/PromoBanners";
import { RankBadge } from "@/components/RankBadge";
import { ShareCardModal } from "@/components/ShareCardModal";
import { StatsTab } from "@/components/StatsTab";
import { TodayWorkoutModal } from "@/components/TodayWorkoutModal";
import { images, rankTierImages } from "@/constants/images";
import type { MuscleGroup } from "@/data/workout-log";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { waitForAuthToken, type ApiCrewLiveSession } from "@/lib/api";
import { mostRecentCrewAchievement } from "@/lib/crew-achievements";
import { crewMuscleBalance } from "@/lib/crew-muscle-balance";
import { describeEvent, divisionFromEvent, EVENT_ICON, EVENT_TINT, tierForPrEvent } from "@/lib/crew-feed";
import { describeResolvedDuel, duelMetricLabel, duelOpponentName } from "@/lib/crew-duel-format";
import { realCurrentWeekMuscleIntensity } from "@/lib/member-real-profile";
import { formatMuscleLabel, intensityToRedGreenColor } from "@/lib/muscle-groups";
import { formatRankTier } from "@/lib/rank";
import { formatShortAgo } from "@/lib/time-since";
import { formatWeight } from "@/lib/units";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewDuelStore } from "@/store/crew-duel-store";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { useCrewLeagueStore } from "@/store/crew-league-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { TOKENS_PER_BATTLE_WIN, useCurrencyStore } from "@/store/currency-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useSyncStatusStore } from "@/store/sync-status-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

/** Bonus crew XP for actually winning a War — same shape/value as ChallengesTab's BATTLE_WIN_XP_BONUS. */
const WAR_WIN_XP_BONUS = 200;

const TABS = ["Overview", "War", "League", "Challenges", "Rivals", "Stats", "Settings"] as const;
type CrewTab = (typeof TABS)[number];

const TAB_ICON: Record<CrewTab, keyof typeof Ionicons.glyphMap> = {
  Overview: "home",
  War: "shield-half",
  League: "podium",
  Challenges: "flag",
  Rivals: "people",
  Stats: "stats-chart",
  Settings: "settings-outline",
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

const AVATAR_SIZE = 84;

function InfoChip({ icon, label, tint, id }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; id: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-surface px-2.5 py-1">
      <Ionicons name={icon} size={11} color={tint} />
      <EditableText id={id} className="caption font-body-semibold" style={{ color: tint }}>
        {label}
      </EditableText>
    </View>
  );
}

/** The top of Crew, styled exactly like Home's own hero (see `HomeHero`) — the same eyebrow, the same letter-by-letter
 * Reacticx `animated-text` reveal. No `ChromaFrame` ring around the crew badge — removed app-wide
 * ("dat is kanker lelijk... haal het overal ook weg"), so the plain badge is just bigger instead. */
function CrewBanner() {
  const name = useCrewStore((state) => state.name);
  const tagline = useCrewStore((state) => state.tagline);
  const icon = useCrewStore((state) => state.icon);
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
  const division = useCrewStore((state) => state.division);

  return (
    <View className="gap-4 px-4 pt-5">
      <Text style={HOME_EYEBROW}>YOUR CREW</Text>
      <View className="flex-row items-center gap-3">
        <CrewIconBadge iconKey={icon} size={AVATAR_SIZE} />
        <View className="flex-1 gap-2">
          <AnimatedText
            text={name.toUpperCase()}
            animationConfig={{ characterDelay: 16 }}
            enterFrom={{ translateY: 20, scale: 0.6 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 30, letterSpacing: 1, color: colors.brand.white }}
          />
          <View className="flex-row flex-wrap items-center gap-2">
            <InfoChip id="crew.banner.division" icon="shield" label={division} tint={colors.brand.yellow} />
            <InfoChip id="crew.banner.memberCount" icon="people" label={`${members.length}/${maxMembers}`} tint={colors.neutral.textSecondary} />
          </View>
        </View>
      </View>
      {tagline ? (
        <EditableText id="crew.banner.tagline" style={HOME_ROW_DETAIL}>
          {tagline}
        </EditableText>
      ) : null}
    </View>
  );
}

// Chips are sized to their own content and sit in a single horizontally scrollable row instead of
// being squeezed flex-1-even into one bar — with 7 tabs that bar had no room left to breathe, and
// wrapping to a second row isn't allowed (see FILTERS chips on crew/members.tsx for the same pattern).
// Reacticx's segmented-control was considered here but it lays out a fixed width divided evenly among
// its children with no built-in scroll — the wrong shape for 7 unevenly-sized, icon+label tabs.
function CrewTopTabs({ active, onChange }: { active: CrewTab; onChange: (tab: CrewTab) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-5"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => (tab === "Settings" ? router.push("/crew/settings") : onChange(tab))}
            className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${isActive ? "bg-brand-yellow" : "bg-surface"}`}
          >
            <Ionicons name={TAB_ICON[tab]} size={13} color={isActive ? colors.brand.iron : colors.neutral.textSecondary} />
            <Text className={`caption font-body-semibold ${isActive ? "text-brand-iron" : "text-text-secondary"}`}>{tab}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <View className="mx-4 mt-10 items-center gap-2 py-10">
      <Ionicons name="hourglass-outline" size={28} color={colors.neutral.textSecondary} />
      <Text style={HOME_ROW_TITLE}>{label.toUpperCase()}</Text>
      <Text style={HOME_ROW_DETAIL}>Coming soon</Text>
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

/** A real, joinable live session (see led-workout-store.ts) was previously only discoverable by
 * tapping into TodayPlanCard's bottom sheet — this surfaces it right at the top of Overview instead,
 * since a live crewmate session is the single most convertible moment the crew tab has (join now vs.
 * scroll past and never see it). Only rendered when there's a session neither leading nor already
 * joined — see the `canJoin` condition CrewActivitySheet uses for the same state. Styled as a flowing
 * row, not a boxed banner — the live dot and yellow "join" chevron already say "this one's different". */
function LiveSessionBanner({ session, onPress }: { session: ApiCrewLiveSession; onPress: () => void }) {
  return (
    <HomeRow onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <HomeRowLead kind="flat">
          <Ionicons name="flash" size={18} color={HOME_ACCENT} />
        </HomeRowLead>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <LiveDot />
            <Text style={HOME_EYEBROW}>LIVE NOW</Text>
          </View>
          <Text style={HOME_ROW_TITLE} numberOfLines={1}>
            {session.leaderName.toUpperCase()}
          </Text>
          <Text style={HOME_ROW_DETAIL} numberOfLines={1}>
            {`${session.workoutName} · tap to join`}
          </Text>
        </View>
      </View>
    </HomeRow>
  );
}

/** The crew-internal motivation feed — real, timestamped crewmate moments (PR / streak milestone /
 * long session / division up), logged from workout/active.tsx and profile-level-store.ts right when
 * each is detected. See backend/routes/crew-activity-events.php. Renders nothing until there's at
 * least one real event, same "don't show an empty state for a feature nobody's used yet" idea as
 * RecentAchievementCard. Flowing section, not a boxed card — matches Train This Next's shape on Home. */
function CrewFeedSection() {
  const { user } = useUser();
  const events = useCrewFeedStore((state) => state.events);
  const fetchEvents = useCrewFeedStore((state) => state.fetch);
  const react = useCrewFeedStore((state) => state.react);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const gender = useOnboardingStore((state) => state.onboarding.gender);
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const customExercises = useCustomExercisesStore((state) => state.exercises);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (events.length === 0) return null;

  return (
    <View className="mx-4 gap-4 border-b border-divider pb-5">
      <View className="flex-row items-center justify-between">
        <Text style={HOME_EYEBROW}>CREW ACTIVITY</Text>
        <Pressable onPress={() => router.push("/crew/activity")} hitSlop={6} style={PRESSED_STYLE}>
          <Text className="caption font-body-semibold text-brand-yellow">View all</Text>
        </Pressable>
      </View>

      <View className="gap-4">
        {events.slice(0, 5).map((event) => {
          const isMe = event.userId === user?.id;
          const division = divisionFromEvent(event);
          const prTier = tierForPrEvent(
            event,
            isMe,
            { gender: gender ?? undefined, weightKg: weightKg ?? undefined },
            membersActivity,
            customExercises,
          );
          return (
            <View key={event.id} className="gap-2">
              <View className="flex-row items-center gap-3">
                {division ? (
                  <DivisionBadge division={division} size={36} />
                ) : prTier ? (
                  <RankBadge tier={prTier} size={36} />
                ) : (
                  <HomeRowLead kind="flat">
                    <Ionicons name={EVENT_ICON[event.eventType]} size={16} color={EVENT_TINT[event.eventType]} />
                  </HomeRowLead>
                )}
                <Text className="body-sm flex-1 text-text-secondary" numberOfLines={2}>
                  {describeEvent(event, isMe)}
                </Text>
                <Text style={HOME_ROW_DETAIL}>{formatShortAgo(event.createdAt)}</Text>
              </View>
              <View className="pl-12">
                <CrewEventReactionBar reactions={event.reactions} onReact={(emoji) => react(event.id, emoji)} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Peer Duels — a lighter, 1-on-1 "who does more today" challenge between crewmates (proposed from
 * the Challenge button on crew/members.tsx). Renders nothing until there's at least one real duel,
 * same "don't show an empty state for a feature nobody's used yet" idea as CrewFeedSection. */
function PeerDuelsSection() {
  const { user } = useUser();
  const duels = useCrewDuelStore((state) => state.duels);
  const fetchDuels = useCrewDuelStore((state) => state.fetch);
  const respond = useCrewDuelStore((state) => state.respond);

  useEffect(() => {
    fetchDuels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myDuels = duels.filter((duel) => duel.challengerId === user?.id || duel.opponentId === user?.id).slice(0, 5);
  if (myDuels.length === 0) return null;

  return (
    <View className="mx-4 gap-4 border-b border-divider pb-5">
      <Text style={HOME_EYEBROW}>PEER DUELS</Text>

      <View className="gap-4">
        {myDuels.map((duel) =>
          duel.status === "pending" && duel.opponentId === user?.id ? (
            <View key={duel.id} className="gap-2">
              <Text className="body-sm text-text-primary">
                <Text className="font-body-semibold">{duel.challengerName}</Text> challenged you — most {duelMetricLabel(duel)} today
              </Text>
              <View className="flex-row gap-2">
                <Pressable onPress={() => respond(duel.id, true)} className="flex-1 items-center rounded-full bg-brand-yellow py-2">
                  <Text className="caption font-body-bold text-brand-iron">Accept</Text>
                </Pressable>
                <Pressable onPress={() => respond(duel.id, false)} className="flex-1 items-center rounded-full border border-divider py-2">
                  <Text className="caption font-body-semibold text-text-secondary">Decline</Text>
                </Pressable>
              </View>
            </View>
          ) : duel.status === "pending" ? (
            <Text key={duel.id} style={HOME_ROW_DETAIL}>
              Waiting for {duelOpponentName(duel, user?.id)} · most {duelMetricLabel(duel)} today
            </Text>
          ) : (
            <Text key={duel.id} style={HOME_ROW_DETAIL}>
              {describeResolvedDuel(duel, user?.id)}
            </Text>
          ),
        )}
      </View>
    </View>
  );
}

function RecentAchievementRow() {
  const members = useCrewStore((state) => state.members);
  const myRecords = usePersonalRecordsStore((state) => state.records);
  const myGender = useOnboardingStore((state) => state.onboarding.gender);
  const myWeightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const myCustomExercises = useCustomExercisesStore((state) => state.exercises);
  const weightUnit = useWeightUnit();

  const result = mostRecentCrewAchievement(members, myRecords, myGender, myWeightKg, membersActivity, myCustomExercises);
  if (!result) return null;

  const { member, achievement, rankTier } = result;
  const isMe = member.id === CURRENT_MEMBER_ID;

  return (
    <HomeRow>
      <View className="flex-row items-center gap-3">
        <HomeRowLead kind="flat">
          <Image source={rankTierImages[rankTier]} resizeMode="contain" style={{ width: 30, height: 30 }} />
        </HomeRowLead>
        <View className="flex-1 gap-0.5">
          <Text style={HOME_EYEBROW}>RECENT ACHIEVEMENT</Text>
          <EditableText id="crew.achievement.memberName" style={HOME_ROW_TITLE} numberOfLines={1}>
            {(isMe ? "You" : member.name).toUpperCase()}
          </EditableText>
          <EditableText id="crew.achievement.detail" style={HOME_ROW_DETAIL} numberOfLines={1}>
            {`${formatRankTier(rankTier)} · ${achievement.exerciseName} · ${formatWeight(achievement.weightKg, weightUnit)} · ${formatShortAgo(achievement.achievedAt)}`}
          </EditableText>
        </View>
      </View>
    </HomeRow>
  );
}

/** Home's `HomeMuscleHero` treatment, applied to the crew-wide balance — one full-size silhouette
 * across everyone's training instead of a boxed mini-card, a red-green scale bar underneath in place
 * of a paragraph explaining what it means. */
/** Tapping a muscle on the crew silhouette (`MuscleHeatmap`'s own `onPressGroup`) reveals who's
 * actually behind that group's load this week, ranked — the heatmap says WHAT is imbalanced,
 * this says WHO to blame or thank for it. Reacticx `animated-text` + `number-flow` for the reveal,
 * so tapping around the body feels like querying live data, not just reading a static picture. */
function MuscleBalanceSection() {
  const members = useCrewStore((state) => state.members);
  const myWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const muscleIntensity = crewMuscleBalance(members, myWorkouts, membersActivity);
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const leaders = selected
    ? members
        .map((member) => {
          const workouts = member.id === CURRENT_MEMBER_ID ? myWorkouts : (membersActivity[member.id]?.recentWorkouts ?? []);
          const intensity = realCurrentWeekMuscleIntensity(workouts)[selected] ?? 0;
          return { member, intensity };
        })
        .filter((entry) => entry.intensity > 0)
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 3)
    : [];

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text style={HOME_EYEBROW}>{`ACROSS ALL ${members.length} MEMBERS`}</Text>
        <Text style={HOME_SECTION_TITLE}>MUSCLE BALANCE</Text>
      </View>

      <View className="items-center">
        <MuscleHeatmap
          muscleIntensity={muscleIntensity}
          height={230}
          view="front"
          showLegend={false}
          showViewLabel={false}
          colorForIntensity={intensityToRedGreenColor}
          onPressGroup={(group) => setSelected((prev) => (prev === group ? null : group))}
        />
      </View>

      <View className="gap-1.5">
        {/* No native linear-gradient view here, so the scale is approximated with evenly spaced
            solid bands matching the same red-green function the body silhouette uses. */}
        <View className="flex-row overflow-hidden rounded-full" style={{ height: 8 }}>
          {Array.from({ length: 20 }).map((_, index) => (
            <View key={index} className="flex-1" style={{ backgroundColor: intensityToRedGreenColor((index / 19) * 10) }} />
          ))}
        </View>
        <View className="flex-row justify-between">
          <Text style={HOME_ROW_DETAIL}>LOW</Text>
          <Text style={HOME_ROW_DETAIL}>HIGH</Text>
        </View>
      </View>

      {selected && (
        <Animated.View entering={FadeInDown.duration(220)} className="gap-3 border-t border-divider pt-4">
          <AnimatedText
            key={selected}
            text={`${formatMuscleLabel(selected).toUpperCase()} THIS WEEK`}
            animationConfig={{ characterDelay: 10 }}
            enterFrom={{ translateY: 10, scale: 0.8 }}
            style={HOME_EYEBROW}
          />
          {leaders.length === 0 ? (
            <Text style={HOME_ROW_DETAIL}>Nobody&apos;s trained this yet this week.</Text>
          ) : (
            <View className="gap-3">
              {leaders.map(({ member, intensity }, index) => (
                <View key={member.id} className="flex-row items-center gap-3">
                  <HomeRowLead kind="flat">
                    <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, color: index === 0 ? HOME_ACCENT : colors.neutral.textSecondary }}>{index + 1}</Text>
                  </HomeRowLead>
                  <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
                    {member.id === CURRENT_MEMBER_ID ? "You" : member.name}
                  </Text>
                  <NumberFlow value={intensity} fontSize={16} color={colors.brand.white} fontWeight="800" />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function CrewEmptyState() {
  return (
    <View className="flex-1 items-center justify-center gap-6 px-8 pt-16">
      <Image source={images.mascotsCrew} resizeMode="contain" style={{ width: 220, height: 220 * (420 / 520) }} />
      <View className="items-center gap-2">
        <Text style={HOME_SECTION_TITLE}>NO CREW YET</Text>
        <Text style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>Join your friends or create your own crew to plan workouts and compete together.</Text>
      </View>
      <Pressable onPress={() => router.push("/build-crew/choose-path")} className="w-full items-center rounded-full bg-brand-yellow py-4">
        <Text className="body-md font-body-bold text-brand-iron">Set Up Your Crew</Text>
      </Pressable>
    </View>
  );
}

export default function CrewScreen() {
  const [activeTab, setActiveTab] = useState<CrewTab>("Overview");
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const posthog = usePostHog();

  const { user } = useUser();
  const session = useLedWorkoutStore((state) => state.session);
  const refreshLiveSession = useLedWorkoutStore((state) => state.refresh);
  const hasWorkoutInProgress = useActiveWorkoutStore((state) => state.startedAt !== null);
  const setTodayOverride = useTodayTrainingStore((state) => state.setTodayOverride);
  const clearTodayOverride = useTodayTrainingStore((state) => state.clearTodayOverride);
  const today = useTodayWorkout();
  const hasCrew = useCrewStore((state) => state.members.length > 0);
  const crewId = useCrewStore((state) => state.id);
  const crewName = useCrewStore((state) => state.name);
  const crewIcon = useCrewStore((state) => state.icon);
  const addCrewXp = useCrewStore((state) => state.addXp);
  const fetchCrewActivity = useCrewActivityStore((state) => state.fetchForCrew);
  const hasSyncedOnce = useSyncStatusStore((state) => state.hasSyncedOnce);
  const weightUnit = useWeightUnit();

  // End-of-War recap (see CrewWarRecapCard) — `lastCompletedWar` is a separate fetch from `war`
  // above because the backend always replaces a just-ended War with a fresh one the instant
  // there's no active one (see getActiveWar's doc comment), so a completed War is otherwise never
  // actually visible to the client at all.
  const lastCompletedWar = useCrewWarStore((state) => state.lastCompletedWar);
  const fetchLastCompletedWar = useCrewWarStore((state) => state.fetchLastCompleted);
  const rewardedWarIds = useCrewWarStore((state) => state.rewardedWarIds);
  const markWarRewarded = useCrewWarStore((state) => state.markRewarded);
  const seenWarRecapIds = useCrewWarStore((state) => state.seenRecapWarIds);
  const markWarRecapSeen = useCrewWarStore((state) => state.markRecapSeen);
  const grantTokens = useCurrencyStore((state) => state.grantTokens);

  // End-of-League-week recap (see CrewLeagueRecapCard) — `history[0]` is always the most recently
  // finalized week the moment syncWeek (called from (tabs)/_layout.tsx) computes it, so there's no
  // separate fetch needed the way the War recap needs one.
  const leagueHistory = useCrewLeagueStore((state) => state.history);
  const seenLeagueRecapWeekKeys = useCrewLeagueStore((state) => state.seenRecapWeekKeys);
  const markLeagueRecapSeen = useCrewLeagueStore((state) => state.markRecapSeen);
  const latestLeagueWeek = leagueHistory[0] ?? null;

  // `session.leaderId`/`participantIds` are real Clerk ids from the backend, not the local
  // CURRENT_MEMBER_ID alias crew-store.ts remaps "me" to within `members` — see its doc comment.
  const iAmLeader = !!user && session?.leaderId === user.id;
  const iHaveJoined = !!user && (session?.participantIds.includes(user.id) ?? false);

  // Real crewmate workouts/PRs for MuscleBalanceSection/RecentAchievementRow (see
  // crew-activity-store.ts) — fetched once the real crew id is known, not before. `crewId` comes
  // from crew-store.ts's persisted state, so it can already be populated from a *previous* session
  // the instant this screen mounts after a hard refresh — well before Clerk's session/token has
  // finished restoring. Firing the request at that instant sends it with no (or a stale) token,
  // which the backend correctly rejects (401, or 403 from the crew-membership check landing on a
  // token that doesn't resolve to this user yet). `waitForAuthToken` closes exactly that gap.
  useEffect(() => {
    if (!crewId) return;
    let cancelled = false;
    waitForAuthToken().then(() => {
      if (!cancelled) fetchCrewActivity(crewId);
    });
    return () => {
      cancelled = true;
    };
  }, [crewId, fetchCrewActivity]);

  useEffect(() => {
    if (!crewId) return;
    let cancelled = false;
    waitForAuthToken().then(() => {
      if (!cancelled) refreshLiveSession();
    });
    return () => {
      cancelled = true;
    };
  }, [crewId, refreshLiveSession]);

  useEffect(() => {
    if (!crewId) return;
    let cancelled = false;
    waitForAuthToken().then(() => {
      if (!cancelled) fetchLastCompletedWar();
    });
    return () => {
      cancelled = true;
    };
  }, [crewId, fetchLastCompletedWar]);

  // Grants the War win bonus exactly once per War, the first time any device notices it was
  // actually won — moved here from CrewWarTab so it fires the moment `lastCompletedWar` loads,
  // regardless of which crew sub-tab happens to be open, not only when a member visits War specifically.
  useEffect(() => {
    if (lastCompletedWar && lastCompletedWar.won === true && !rewardedWarIds.includes(lastCompletedWar.id)) {
      addCrewXp(WAR_WIN_XP_BONUS, `war:${lastCompletedWar.id}`);
      grantTokens(TOKENS_PER_BATTLE_WIN);
      markWarRewarded(lastCompletedWar.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCompletedWar?.id, lastCompletedWar?.won]);

  // Same "wait for the real database pull before showing anything" gate as (tabs)/home.tsx — see
  // sync-status-store.ts. Blocks on the same sign-in sync, so a stale/local crew state (or none at
  // all yet) never flashes before the real one arrives.
  if (!hasSyncedOnce) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.brand.yellow} />
      </View>
    );
  }

  if (!hasCrew) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="flex-1">
        <CrewEmptyState />
      </ScrollView>
    );
  }

  const warRecapVisible = !!lastCompletedWar && !seenWarRecapIds.includes(lastCompletedWar.id);
  // Only one recap modal on screen at a time — a War and a League week finishing in the same visit
  // is rare, but stacking two full-screen "share this" modals would be worse than just showing the
  // War one first and letting the League one surface the next time this screen mounts.
  const leagueRecapVisible = !warRecapVisible && !!latestLeagueWeek && !seenLeagueRecapWeekKeys.includes(latestLeagueWeek.weekKey);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <PromoBanners placement="crew" />
      <CrewBanner />
      <CrewTopTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" ? (
        <View className="mt-2">
          {session && !iAmLeader && !iHaveJoined && (
            <View className="mx-4">
              <LiveSessionBanner session={session} onPress={() => router.push("/crew/join-workout")} />
            </View>
          )}

          {/* Division, Crew Power, Members and Today's Plan — Crew's own "glance at one number"
              content, moved off flowing rows onto the same swipeable Reacticx `tilt-carousel` deck
              Home's own quick-glance cards use ("style de crew page waar het kan ook zoals de home
              met die cards"). Everything below this (the crew feed, peer duels, the recent-
              achievement row, muscle balance) stays a full-width flowing section — the same call
              `HomeCarousel` itself makes for content that needs real reading width rather than a
              one-glance card. */}
          <AttachStep index={ATTACH_INDEXES.crew} fill>
            <HomeReveal index={2} bleed tight>
              <CrewCarousel onPressPlan={() => setActivitySheetOpen(true)} />
            </HomeReveal>
          </AttachStep>

          <HomeReveal index={5}>
            <CrewFeedSection />
          </HomeReveal>
          <HomeReveal index={6}>
            <PeerDuelsSection />
          </HomeReveal>
          <View className="mx-4">
            <HomeReveal index={7} tight>
              <RecentAchievementRow />
            </HomeReveal>
          </View>
          {/* Home's own flat-card treatment (see `home.tsx`'s `VisualTrainingCalendar` wrapper, and
              `HomeStrengthTrend`'s own "Objective Proof" card) applied here too — "bij de crew pages
              moet je ook de card styling gebruiken van de home zoals je objective proof bij sommige
              dingen." A data-viz section like this one (a heatmap + legend + a leaderboard that
              expands under it) reads as a distinct module the same way the calendar does on Home,
              so it gets the same rounded, flat `colors.neutral.surface` boundary instead of just
              running straight into the page background like the flowing rows above it. */}
          <View className="mx-4">
            <HomeReveal index={8} tight>
              <View style={{ borderRadius: 28, backgroundColor: colors.neutral.surface, padding: 20 }}>
                <MuscleBalanceSection />
              </View>
            </HomeReveal>
          </View>
        </View>
      ) : activeTab === "War" ? (
        <CrewWarTab />
      ) : activeTab === "League" ? (
        <CrewLeagueTab />
      ) : activeTab === "Challenges" ? (
        <ChallengesTab />
      ) : activeTab === "Rivals" ? (
        <CrewRivalsTab />
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
        onSave={(name) => {
          setTodayOverride(name);
          posthog.capture("crew_todays_training_set");
        }}
        onClearOverride={clearTodayOverride}
      />

      {lastCompletedWar && (
        <ShareCardModal
          visible={warRecapVisible}
          onClose={() => markWarRecapSeen(lastCompletedWar.id)}
          fallbackMessage={`${crewName} ${
            lastCompletedWar.won === true ? "won" : lastCompletedWar.won === false ? "lost" : "drew"
          } their Crew War vs ${lastCompletedWar.opponent.name} — ${formatWeight(lastCompletedWar.myScore, weightUnit)} vs ${formatWeight(lastCompletedWar.opponentScore, weightUnit)}. 💪`}
        >
          <CrewWarRecapCard war={lastCompletedWar} crewName={crewName} crewIcon={crewIcon} />
        </ShareCardModal>
      )}

      {latestLeagueWeek && (
        <ShareCardModal
          visible={leagueRecapVisible}
          onClose={() => markLeagueRecapSeen(latestLeagueWeek.weekKey)}
          fallbackMessage={`${crewName} finished #${latestLeagueWeek.myRank} of ${latestLeagueWeek.totalCrews} in the ${latestLeagueWeek.division} League this week!`}
        >
          <CrewLeagueRecapCard result={latestLeagueWeek} crewName={crewName} crewIcon={crewIcon} />
        </ShareCardModal>
      )}
    </ScrollView>
  );
}
