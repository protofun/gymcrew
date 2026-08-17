import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";
import { XpProgressModal } from "@/components/XpProgressModal";
import { images } from "@/constants/images";
import { NOTIFICATIONS } from "@/data/notifications";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const XP = 340;
const XP_TO_NEXT_LEVEL = 500;
const STREAK_DAYS = 4;
const CREW_POINTS = 3200;
const CREW_POINTS_GOAL = 5000;
const TRAINED_DAYS_THIS_WEEK = [true, true, false, true, false, false, false];

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const [progressModalVisible, setProgressModalVisible] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });
  if (redirect) return <Redirect href={redirect} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <TopBar avatarSource={images.iconGorilla} streakDays={STREAK_DAYS} notifications={NOTIFICATIONS} />

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
        streakDays={STREAK_DAYS}
        xp={XP}
        xpToNextLevel={XP_TO_NEXT_LEVEL}
        crewPoints={CREW_POINTS}
        crewPointsGoal={CREW_POINTS_GOAL}
        trainedDays={TRAINED_DAYS_THIS_WEEK}
      />
    </View>
  );
}
