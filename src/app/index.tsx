import { useAuth, useUser } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect } from "react";

import { useClerkFlagSync } from "@/hooks/use-clerk-flag-sync";
import { getPostAuthRedirect } from "@/lib/onboarding-gate";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const hasCompletedCrewSelection = useOnboardingStore((state) => state.hasCompletedCrewSelection);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);

  // A signed-in account's Clerk profile can carry "already onboarded" / "already picked a crew"
  // (see lib/clerk.ts) independent of this device's own local storage or this app's backend being
  // reachable — synced both ways here so a returning user on a fresh device, or an account that
  // predates these flags, both self-heal instead of redoing the wizard/crew-setup every time.
  const clerkOnboarded = user?.unsafeMetadata?.hasCompletedOnboarding === true;
  const clerkCrewSelected = user?.unsafeMetadata?.hasCompletedCrewSelection === true;
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedOnboarding, clerkOnboarded, completeOnboarding);
  useClerkFlagSync(Boolean(isSignedIn), hasCompletedCrewSelection, clerkCrewSelected, completeCrewSelection);

  // Best-effort backend sync too (pulls real profile fields like weight/height) — doesn't block
  // the redirect below, since the Clerk metadata check above already covers "skip the wizard."
  // Only needed pre-onboarding-complete here: once `hasCompletedOnboarding` is true the redirect
  // below sends this straight into the tabs, whose own layout already does a full, unconditional
  // syncProfileFromServer() (alongside every other store) on every signed-in mount — see
  // (tabs)/_layout.tsx. Doing it again here too would just be a redundant extra round-trip.
  useEffect(() => {
    if (isSignedIn && !hasCompletedOnboarding) {
      useOnboardingStore.getState().syncProfileFromServer();
    }
  }, [isSignedIn, hasCompletedOnboarding]);

  // Pushes the real, verified Clerk email to the backend on every signed-in visit — not just during
  // onboarding — so `users.email` gets backfilled for accounts that existed before this existed too
  // (see onboarding-store.ts's syncEmailToBackend). Fire-and-forget here; build-crew/_layout.tsx
  // separately awaits its own call to this before deciding whether a Founding Athlete Crew already
  // exists, so the crew-selection gate never races this one.
  const email = user?.primaryEmailAddress?.emailAddress;
  useEffect(() => {
    if (isSignedIn && email) {
      useOnboardingStore.getState().syncEmailToBackend(email);
    }
  }, [isSignedIn, email]);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  const redirect = getPostAuthRedirect({
    hasCompletedOnboarding: hasCompletedOnboarding || clerkOnboarded,
    hasCompletedCrewSelection: hasCompletedCrewSelection || clerkCrewSelected,
  });

  return <Redirect href={redirect ?? "/home"} />;
}
