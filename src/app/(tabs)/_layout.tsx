import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { AdminMessageOverlay } from "@/components/AdminMessageOverlay";
import { AppTourProvider } from "@/components/AppTourOverlay";
import { SocialsPromptOverlay } from "@/components/SocialsPromptOverlay";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { XpProgressModal } from "@/components/XpProgressModal";
import { images } from "@/constants/images";
import { OTHER_CREWS_POWER } from "@/data/crew-leaderboard";
import { useClerkFlagSync } from "@/hooks/use-clerk-flag-sync";
import { isApiConfigured, waitForAuthToken } from "@/lib/api";
import { appTourRef } from "@/lib/app-tour";
import { computeCrewWeeklyPower, sameDivisionRivals } from "@/lib/crew-league";
import { flushLocalStateToServer } from "@/lib/flush-local-state";
import { xpRequiredFor } from "@/lib/division";
import { buildCreatineReminderNotification, buildCrewNotifications, buildNotifications, NOTIFICATIONS_LIMIT } from "@/lib/notifications";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { addForegroundNotificationToastListener, reconcileNotificationSchedules, registerForPushNotifications } from "@/lib/push-notifications";
import { computeCurrentStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useAdminChallengeStore } from "@/store/admin-challenge-store";
import { useAdminMessageStore } from "@/store/admin-message-store";
import { useBlockedUsersStore } from "@/store/blocked-users-store";
import { useBodyLogStore } from "@/store/body-log-store";
import { useChallengeStore } from "@/store/challenge-store";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { useCrewLeagueStore } from "@/store/crew-league-store";
import { useCrewStore } from "@/store/crew-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useCustomFoodsStore } from "@/store/custom-foods-store";
import { useCustomWorkoutsStore } from "@/store/custom-workouts-store";
import { useFavoriteExercisesStore } from "@/store/favorite-exercises-store";
import { useFavoriteFoodsStore } from "@/store/favorite-foods-store";
import { useGoalsStore } from "@/store/goals-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useAiMealsStore } from "@/store/ai-meals-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionMealsStore } from "@/store/nutrition-meals-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useSyncStatusStore } from "@/store/sync-status-store";
import { useThemeStore } from "@/store/theme-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { useTutorialStore } from "@/store/tutorial-store";
import { useUserSocialsStore } from "@/store/user-socials-store";
import { useWaterLogStore } from "@/store/water-log-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";
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
  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const blockedUserIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const notifications = useMemo(() => {
    const personal = buildNotifications(
      workouts,
      streakDays,
      {
        weightKg: onboarding.weightKg,
        gender: onboarding.gender,
        age: onboarding.age,
      },
      customExercises,
    );
    const crew = buildCrewNotifications(crewFeedEvents, user?.id, Date.now(), blockedUserIds);
    const creatine = buildCreatineReminderNotification(onboarding.creatineReminders ?? true, onboarding.creatineReminderTime ?? "09:00");
    return [...personal, ...crew, ...creatine].sort((a, b) => b.timestamp - a.timestamp).slice(0, NOTIFICATIONS_LIMIT);
  }, [workouts, streakDays, onboarding.weightKg, onboarding.gender, onboarding.age, onboarding.creatineReminders, onboarding.creatineReminderTime, crewFeedEvents, customExercises, user?.id, blockedUserIds]);
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
  // Re-reconciling notification schedules once this resolves matters specifically for the crew
  // muscle-balance nudge (see push-notifications.ts) — the sign-in sync's own reconcile call can
  // land before this fetch does, computing that nudge from an empty `membersActivity` (i.e. only
  // this device's own workouts). Every other reminder only reads already-loaded local stores, so
  // this is the one that needs a second pass once real crewmate data actually arrives.
  const crewId = useCrewStore((state) => state.id);
  const fetchCrewActivity = useCrewActivityStore((state) => state.fetchForCrew);
  useEffect(() => {
    if (crewId) fetchCrewActivity(crewId).then(() => reconcileNotificationSchedules());
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

  // Whether this account has submitted the "Connect Your Socials" prompt yet — checked on every
  // signed-in mount (i.e. every app open), not just once, so SocialsPromptOverlay below keeps
  // appearing on later opens for anyone who never submits, not only the first time they see it.
  const checkSocialsStatus = useUserSocialsStore((state) => state.checkStatus);
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    waitForAuthToken().then(() => {
      if (!cancelled) checkSocialsStatus();
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, checkSocialsStatus]);

  // Any admin-composed message targeted at this account (see AdminMessageOverlay) — checked on
  // every signed-in mount too, same reasoning as the socials check above.
  const checkPendingAdminMessages = useAdminMessageStore((state) => state.checkPending);
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    waitForAuthToken().then(() => {
      if (!cancelled) checkPendingAdminMessages();
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, checkPendingAdminMessages]);

  // Once per sign-in: pull the real backend state for every backend-synced store — see lib/api.ts
  // and lib/backend-sync.ts. A no-op until EXPO_PUBLIC_API_BASE_URL is actually configured. Crew,
  // challenges, and the crew league sync too now — but as "this account's own saved view," not yet
  // a row genuinely shared live with other real members. (Crew live-workout sessions are already
  // genuinely shared — see led-workout-store.ts's `refresh` — but that's polled from the Crew tab
  // on demand, not pulled here alongside the rest.) Waits for a real session first (see
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
        useWorkoutSplitStore.getState().syncFromServer(),
        useCustomFoodsStore.getState().syncFromServer(),
        useFavoriteFoodsStore.getState().syncFromServer(),
        useNutritionTargetsStore.getState().syncFromServer(),
        useNutritionMealsStore.getState().syncFromServer(),
        useNutritionLogStore.getState().syncFromServer(),
        useAiMealsStore.getState().syncFromServer(),
        useWaterLogStore.getState().syncFromServer(),
        useBlockedUsersStore.getState().syncFromServer(),
      ]);
      if (cancelled) return;

      // After pulling, push whatever's still only sitting in local storage — covers any store
      // whose past pushes silently failed (e.g. while the backend was unreachable) and never
      // actually reached the database. See lib/flush-local-state.ts for exactly what this does
      // and doesn't cover.
      flushLocalStateToServer();
      useSyncStatusStore.getState().markSyncedOnce();

      // Registers this device's push token (idempotent, no-op if permission was already decided)
      // and re-applies the reminder toggles' current state to this device's actual OS-level
      // schedule — see lib/push-notifications.ts's reconcileNotificationSchedules doc comment for
      // why that can't just be "set once and forget."
      registerForPushNotifications().then(reconcileNotificationSchedules);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  // Surfaces a push that arrives while the app is open as the app's own toast (see
  // lib/push-notifications.ts) instead of a generic OS banner. Lives for the whole signed-in tab
  // shell, independent of the sync effect above.
  useEffect(() => {
    const subscription = addForegroundNotificationToastListener();
    return () => subscription.remove();
  }, []);

  // Same self-healing check as app/index.tsx — reaching a tab directly (e.g. a bookmark, or a
  // relaunched PWA resuming its last URL) with fresh local storage shouldn't bounce a genuinely
  // returning account back out to onboarding/crew-setup. See hooks/use-clerk-flag-sync.ts.
  const clerkOnboarded = user?.unsafeMetadata?.hasCompletedOnboarding === true;
  const clerkCrewSelected = user?.unsafeMetadata?.hasCompletedCrewSelection === true;
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedOnboarding, clerkOnboarded, completeOnboarding);
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedCrewSelection, clerkCrewSelected, completeCrewSelection);

  // First time this device reaches the real app post-onboarding: auto-start the mascot-narrated
  // app tour. A short delay lets the Home screen actually settle in behind it. Only ever fires
  // once per device — see tutorial-store.ts's `hasSeenTutorial`. Admins can replay it manually via
  // profile/account.tsx's "Open Tutorial Wizard" button, which doesn't touch this flag.
  const hasSeenTutorial = useTutorialStore((state) => state.hasSeenTutorial);
  useEffect(() => {
    if (!(hasCompletedOnboarding || clerkOnboarded)) return;
    if (!(hasCompletedCrewSelection || clerkCrewSelected)) return;
    if (hasSeenTutorial) return;
    const timer = setTimeout(() => appTourRef.current?.start(), 700);
    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding, clerkOnboarded, hasCompletedCrewSelection, clerkCrewSelected, hasSeenTutorial]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  const redirect = getPostAuthRedirect({
    hasCompletedOnboarding: hasCompletedOnboarding || clerkOnboarded,
    hasCompletedCrewSelection: hasCompletedCrewSelection || clerkCrewSelected,
  });
  if (redirect) return <Redirect href={redirect} />;

  return (
    <AppTourProvider>
      <View style={{ flex: 1, backgroundColor: colors.neutral.background }}>
        <TopBar avatarSource={images.iconGorilla} streakDays={streakDays} notifications={notifications} />

        <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="home" options={{ title: "Home" }} />
          <Tabs.Screen name="crew" options={{ title: "Crew" }} />
          <Tabs.Screen name="log" options={{ title: "Log" }} />
          <Tabs.Screen name="ranks" options={{ title: "Ranks" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>

        <XpProgressModal visible={progressModalVisible} onClose={() => setProgressModalVisible(false)} streakDays={streakDays} xp={profileXp} xpToNextLevel={xpRequiredFor(profileDivision)} crewPoints={crewXp} crewPointsGoal={xpRequiredFor(crewDivision)} trainedDays={trainedDaysThisWeek} />
        <SocialsPromptOverlay />
        <AdminMessageOverlay />
      </View>
    </AppTourProvider>
  );
}
