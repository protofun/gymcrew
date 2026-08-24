import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { XpProgressModal } from "@/components/XpProgressModal";
import { images } from "@/constants/images";
import { OTHER_CREWS_POWER } from "@/data/crew-leaderboard";
import { computeCrewWeeklyPower, sameDivisionRivals } from "@/lib/crew-league";
import { xpRequiredFor } from "@/lib/division";
import { buildNotifications } from "@/lib/notifications";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { computeCurrentStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { useBodyLogStore } from "@/store/body-log-store";
import { useCrewLeagueStore } from "@/store/crew-league-store";
import { useCrewStore } from "@/store/crew-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const streakDays = computeCurrentStreak(workouts, new Date(), useCurrencyStore.getState().freezeDateKeys);
  const trainedDaysThisWeek = computeTrainedDaysThisWeek(workouts);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const notifications = useMemo(
    () => buildNotifications(workouts, streakDays, { weightKg: onboarding.weightKg, gender: onboarding.gender, age: onboarding.age }),
    [workouts, streakDays, onboarding.weightKg, onboarding.gender, onboarding.age],
  );
  const profileXp = useProfileLevelStore((state) => state.xp);
  const profileDivision = useProfileLevelStore((state) => state.division);
  const crewXp = useCrewStore((state) => state.xp);
  const crewDivision = useCrewStore((state) => state.division);
  const crewName = useCrewStore((state) => state.name);
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewMembers = useCrewStore((state) => state.members);
  const syncLeagueWeek = useCrewLeagueStore((state) => state.syncWeek);

  // Ambient: the weekly crew league advances (and promotes/relegates) the moment the calendar week
  // rolls over, whether or not the user ever opens the League tab.
  useEffect(() => {
    syncLeagueWeek({
      myCrewName: crewName,
      myCrewPower: crewPower,
      rivalCrews: sameDivisionRivals(OTHER_CREWS_POWER, crewDivision),
      computeWeeklyPower: (startKey, endKey) => computeCrewWeeklyPower(crewMembers, workouts, startKey, endKey),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewName, crewPower, crewMembers, workouts]);

  // Once per sign-in: pull the real backend state for the "core" data (profile, workouts, PRs,
  // body log) — see lib/api.ts. A no-op until EXPO_PUBLIC_API_BASE_URL is actually configured.
  useEffect(() => {
    if (!isSignedIn) return;
    useOnboardingStore.getState().syncProfileFromServer();
    useWorkoutHistoryStore.getState().syncFromServer();
    usePersonalRecordsStore.getState().syncFromServer();
    useBodyLogStore.getState().syncFromServer();
  }, [isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });
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
