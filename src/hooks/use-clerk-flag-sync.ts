import { useEffect } from "react";

/**
 * Keeps a local Zustand "completed" flag (onboarding wizard / crew setup) and its Clerk-account
 * counterpart in sync, in both directions — see lib/clerk.ts. Used by every routing gate that
 * decides whether to show the wizard/crew-setup (app/index.tsx, app/onboarding/_layout.tsx,
 * app/build-crew/_layout.tsx): if either side already says "done," the other catches up, so a
 * returning user on a fresh device (local flag missing) or an account that predates the Clerk flag
 * (Clerk metadata missing) both self-heal instead of getting stuck redoing the flow.
 */
export function useClerkFlagSync(isSignedIn: boolean, localFlag: boolean, clerkFlag: boolean, markComplete: () => void) {
  useEffect(() => {
    if (isSignedIn && clerkFlag && !localFlag) markComplete();
  }, [isSignedIn, clerkFlag, localFlag, markComplete]);

  useEffect(() => {
    if (isSignedIn && localFlag && !clerkFlag) markComplete();
  }, [isSignedIn, localFlag, clerkFlag, markComplete]);
}
