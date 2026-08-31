import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { XpProgressModal } from "@/components/XpProgressModal";
import { images } from "@/constants/images";
import { OTHER_CREWS_POWER } from "@/data/crew-leaderboard";
import { useClerkFlagSync } from "@/hooks/use-clerk-flag-sync";
import { isApiConfigured, waitForAuthToken } from "@/lib/api";
import { computeCrewWeeklyPower, sameDivisionRivals } from "@/lib/crew-league";
import { flushLocalStateToServer } from "@/lib/flush-local-state";
import { xpRequiredFor } from "@/lib/division";
import { buildCreatineReminderNotification, buildCrewNotifications, buildNotifications, NOTIFICATIONS_LIMIT } from "@/lib/notifications";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { computeCurrentStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useAdminChallengeStore } from "@/store/admin-challenge-store";
import { useBodyLogStore } from "@/store/body-log-store";
import { useChallengeStore } from "@/store/challenge-store";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { useCrewLeagueStore } from "@/store/crew-league-store";
import { useCrewStore } from "@/store/crew-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useCustomWorkoutsStore } from "@/store/custom-workouts-store";
import { useFavoriteExercisesStore } from "@/store/favorite-exercises-store";
import { useGoalsStore } from "@/store/goals-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useSyncStatusStore } from "@/store/sync-status-store";
import { useThemeStore } from "@/store/theme-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { useWorkoutNotesStore } from "@/store/workout-notes-store";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const streakDays = computeCurrentStreak(workouts, new Date(), useCurrencyStore.getState().freezeDateKeys);
  const trainedDaysThisWeek = computeTrainedDaysThisWeek(workouts);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const crewFeedEvents = useCrewFeedStore((state) => state.events);
  const notifications = useMemo(() => {
    const personal = buildNotifications(workouts, streakDays, { weightKg: onboarding.weightKg, gender: onboarding.gender, age: onboarding.age });
    const crew = buildCrewNotifications(crewFeedEvents, user?.id);
    const creatine = buildCreatineReminderNotification(onboarding.creatineReminders ?? true);
    return [...personal, ...crew, ...creatine].sort((a, b) => b.timestamp - a.timestamp).slice(0, NOTIFICATIONS_LIMIT);
  }, [workouts, streakDays, onboarding.weightKg, onboarding.gender, onboarding.age, onboarding.creatineReminders, crewFeedEvents, user?.id]);
  const profileXp = useProfileLevelStore((state) => state.xp);
  const profileDivision = useProfileLevelStore((state) => state.division);
  const crewXp = useCrewStore((state) => state.xp);
  const crewDivision = useCrewStore((state) => state.division);
  const crewName = useCrewStore((state) => state.name);
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewMembers = useCrewStore((state) => state.members);
  const crewMembersActivity = useCrewActivityStore((state) => state.membersActivity);
  const syncLeagueWeek = useCrewLeagueStore((state) => state.syncWeek);

  // Ambient: the weekly crew league advances (and promotes/relegates) the moment the calendar week
  // rolls over, whether or not the user ever opens the League tab.
  useEffect(() => {
    syncLeagueWeek({
      myCrewName: crewName,
      myCrewPower: crewPower,
      rivalCrews: sameDivisionRivals(OTHER_CREWS_POWER, crewDivision),
      computeWeeklyPower: (startKey, endKey) => computeCrewWeeklyPower(crewMembers, workouts, crewMembersActivity, startKey, endKey),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewName, crewPower, crewMembers, workouts, crewMembersActivity]);

  // Real crewmate workouts/PRs for the league power calculation above (and for the Crew tab's
  // Overview/Stats cards) — fetched here too, not just when the Crew tab happens to be open, so the
  // weekly league advances correctly from real data even if the user never visits that tab.
  const crewId = useCrewStore((state) => state.id);
  const fetchCrewActivity = useCrewActivityStore((state) => state.fetchForCrew);
  useEffect(() => {
    if (crewId) fetchCrewActivity(crewId);
  }, [crewId, fetchCrewActivity]);

  // The crew-internal motivation feed (see crew-feed-store.ts) — fetched here too, not just when
  // the Crew tab is open, so a crewmate's PR/streak/long-session shows up in the bell notifications
  // even if the user never visits that tab.
  const fetchCrewFeed = useCrewFeedStore((state) => state.fetch);
  useEffect(() => {
    if (crewId) fetchCrewFeed();
  }, [crewId, fetchCrewFeed]);

  // App-wide admin challenges (see admin-challenge-store.ts) — fetched here too, not just when the
  // Challenges tab is open, so `lib/challenge-progress.ts`'s recordChallengeContributions (called the
  // moment any workout finishes, well before that tab might ever be opened) always has the current
  // active list to award progress against.
  const fetchAdminChallenges = useAdminChallengeStore((state) => state.fetch);
  useEffect(() => {
    if (isSignedIn) fetchAdminChallenges();
  }, [isSignedIn, fetchAdminChallenges]);

  // Once per sign-in: pull the real backend state for every backend-synced store — see lib/api.ts
  // and lib/backend-sync.ts. A no-op until EXPO_PUBLIC_API_BASE_URL is actually configured. Crew,
  // challenges, the crew league, and led-workout sessions sync too now — but as "this account's own
  // saved view," not yet a row genuinely shared live with other real members (no invite/membership
  // system exists yet — see backend/README.md). Waits for a real session first (see
  // `waitForAuthToken`) — reaching this tab can happen right on the heels of sign-up/sign-in, before
  // Clerk's session is actually usable yet, which would otherwise make every sync below silently no-op.
  useEffect(() => {
    if (!isSignedIn) return;
    if (!isApiConfigured) {
      // No backend configured (e.g. local dev without .env.local) — nothing to wait for, so don't
      // leave the home screen stuck on its loading gate forever. See sync-status-store.ts.
      useSyncStatusStore.getState().markSyncedOnce();
      return;
    }
    let cancelled = false;
    waitForAuthToken().then(async () => {
      if (cancelled) return;
      // Collected into one Promise.all (every syncFromServer already catches its own errors and
      // resolves regardless, see e.g. workout-history-store.ts) so sync-status-store only flips to
      // "synced" once every one of these has genuinely settled — see home.tsx, which blocks
      // rendering real numbers until then rather than risking a flash of stale local data.
      await Promise.all([
        useOnboardingStore.getState().syncProfileFromServer(),
        useActiveWorkoutStore.getState().syncFromServer(),
        useWorkoutHistoryStore.getState().syncFromServer(),
        usePersonalRecordsStore.getState().syncFromServer(),
        useBodyLogStore.getState().syncFromServer(),
        useProfileLevelStore.getState().syncFromServer(),
        useGoalsStore.getState().syncFromServer(),
        useCurrencyStore.getState().syncFromServer(),
        useCosmeticsStore.getState().syncFromServer(),
        useThemeStore.getState().syncFromServer(),
        useTrackedLiftsStore.getState().syncFromServer(),
        useCustomExercisesStore.getState().syncFromServer(),
        useCustomWorkoutsStore.getState().syncFromServer(),
        useFavoriteExercisesStore.getState().syncFromServer(),
        useWorkoutNotesStore.getState().syncFromServer(),
        useTodayTrainingStore.getState().syncFromServer(),
        useNotificationsStore.getState().syncFromServer(),
        useCrewStore.getState().syncFromServer(),
        useChallengeStore.getState().syncFromServer(),
        useCrewLeagueStore.getState().syncFromServer(),
        useLedWorkoutStore.getState().syncFromServer(),
      ]);
      if (cancelled) return;

      // After pulling, push whatever's still only sitting in local storage — covers any store
      // whose past pushes silently failed (e.g. while the backend was unreachable) and never
      // actually reached the database. See lib/flush-local-state.ts for exactly what this does
      // and doesn't cover.
      flushLocalStateToServer();
      useSyncStatusStore.getState().markSyncedOnce();
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  // Same self-healing check as app/index.tsx — reaching a tab directly (e.g. a bookmark, or a
  // relaunched PWA resuming its last URL) with fresh local storage shouldn't bounce a genuinely
  // returning account back out to onboarding/crew-setup. See hooks/use-clerk-flag-sync.ts.
  const clerkOnboarded = user?.unsafeMetadata?.hasCompletedOnboarding === true;
  const clerkCrewSelected = user?.unsafeMetadata?.hasCompletedCrewSelection === true;
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedOnboarding, clerkOnboarded, completeOnboarding);
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedCrewSelection, clerkCrewSelected, completeCrewSelection);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  const redirect = getPostAuthRedirect({
    hasCompletedOnboarding: hasCompletedOnboarding || clerkOnboarded,
    hasCompletedCrewSelection: hasCompletedCrewSelection || clerkCrewSelected,
  });
  if (redirect) return <Redirect href={redirect} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <TopBar avatarSource={images.iconGorilla} streakDays={streakDays} notifications={notifications} />

      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="crew" options={{ title: "Crew" }} />
        <Tabs.Screen name="log" options={{ title: "Log" }} />
        <Tabs.Screen name="ranks" options={{ title: "Ranks" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>

      <XpProgressModal
        visible={progressModalVisible}
        onClose={() => setProgressModalVisible(false)}
        streakDays={streakDays}
        xp={profileXp}
        xpToNextLevel={xpRequiredFor(profileDivision)}
        crewPoints={crewXp}
        crewPointsGoal={xpRequiredFor(crewDivision)}
        trainedDays={trainedDaysThisWeek}
      />
    </View>
  );
}
