import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);

  if (!isLoaded) return null;

  if (isSignedIn) {
    const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });
    if (redirect !== "/onboarding") return <Redirect href={redirect ?? "/"} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
