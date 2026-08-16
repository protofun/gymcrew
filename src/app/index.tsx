import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });

  return <Redirect href={redirect ?? "/home"} />;
}
