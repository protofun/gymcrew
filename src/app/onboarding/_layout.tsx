import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { useClerkFlagSync } from "@/hooks/use-clerk-flag-sync";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);

  // Same check as app/index.tsx — a signed-in account might land here directly (e.g. a relaunched
  // PWA resuming its last URL) on a device that's never seen this account before locally. See
  // hooks/use-clerk-flag-sync.ts / lib/clerk.ts.
  const clerkOnboarded = user?.unsafeMetadata?.hasCompletedOnboarding === true;
  const clerkCrewSelected = user?.unsafeMetadata?.hasCompletedCrewSelection === true;
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedOnboarding, clerkOnboarded, completeOnboarding);
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedCrewSelection, clerkCrewSelected, completeCrewSelection);

  if (!isLoaded) return null;

  if (isSignedIn) {
    const redirect = getPostAuthRedirect({
      hasCompletedOnboarding: hasCompletedOnboarding || clerkOnboarded,
      hasCompletedCrewSelection: hasCompletedCrewSelection || clerkCrewSelected,
    });
    if (redirect !== "/onboarding") return <Redirect href={redirect ?? "/"} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
