import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { useClerkFlagSync } from "@/hooks/use-clerk-flag-sync";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function BuildCrewLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);

  // Same self-healing check as app/index.tsx — an account that already picked a crew before (on
  // any device) skips this flow too, instead of being asked to pick one again just because this
  // device's local storage is fresh. See hooks/use-clerk-flag-sync.ts / lib/clerk.ts.
  const clerkOnboarded = user?.unsafeMetadata?.hasCompletedOnboarding === true;
  const clerkCrewSelected = user?.unsafeMetadata?.hasCompletedCrewSelection === true;
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedOnboarding, clerkOnboarded, completeOnboarding);
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedCrewSelection, clerkCrewSelected, completeCrewSelection);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;
  // Onboarding itself is still mandatory first — but unlike onboarding, crew selection stays
  // reachable even after it's already been done once (e.g. picked "Maybe Later," or left a crew
  // later on) — see (tabs)/crew.tsx's empty state, whose "Set Up Your Crew" button lands here.
  if (!(hasCompletedOnboarding || clerkOnboarded)) return <Redirect href="/onboarding" />;

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
