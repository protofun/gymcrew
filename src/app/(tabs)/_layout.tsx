import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { XpProgressModal } from "@/components/XpProgressModal";
import { images } from "@/constants/images";
import { NOTIFICATIONS } from "@/data/notifications";
import { xpRequiredFor } from "@/lib/division";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { computeCurrentStreak, computeTrainedDaysThisWeek } from "@/lib/streak";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const streakDays = computeCurrentStreak(workouts);
  const trainedDaysThisWeek = computeTrainedDaysThisWeek(workouts);
  const profileXp = useProfileLevelStore((state) => state.xp);
  const profileDivision = useProfileLevelStore((state) => state.division);
  const crewXp = useCrewStore((state) => state.xp);
  const crewDivision = useCrewStore((state) => state.division);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });
  if (redirect) return <Redirect href={redirect} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <TopBar avatarSource={images.iconGorilla} streakDays={streakDays} notifications={NOTIFICATIONS} />

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
