import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const [backendChecked, setBackendChecked] = useState(false);

  // An active session with no local "completed onboarding" flag usually just means a fresh
  // device/browser (or a PWA install) for an account that has genuinely onboarded before, on some
  // other device — check the backend before dumping them into the wizard again. A no-op (resolves
  // immediately) once already checked, already completed, signed out, or with no backend configured.
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

  if (!isLoaded || !backendChecked) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  const redirect = getPostAuthRedirect({ hasCompletedOnboarding, hasCompletedCrewSelection });

  return <Redirect href={redirect ?? "/home"} />;
}
