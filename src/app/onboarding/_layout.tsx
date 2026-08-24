import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";

import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const [backendChecked, setBackendChecked] = useState(false);

  // Same gap as app/index.tsx: a signed-in account with no local "completed" flag might just be
  // landing here directly (e.g. a relaunched PWA resuming its last URL) on a device that's never
  // synced with the backend yet — check before trapping them in the wizard. See
  // store/onboarding-store.ts's syncProfileFromServer for the "no-op without a backend" behavior.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasCompletedOnboarding) {
      setBackendChecked(true);
      return;
    }
    useOnboardingStore
      .getState()
      .syncProfileFromServer()
      .finally(() => setBackendChecked(true));
  }, [isLoaded, isSignedIn, hasCompletedOnboarding]);

  if (!isLoaded || !backendChecked) return null;

  if (isSignedIn) {
    const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });
    if (redirect !== "/onboarding") return <Redirect href={redirect ?? "/"} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
