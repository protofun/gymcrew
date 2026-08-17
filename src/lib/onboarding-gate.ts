type GateInput = {
  hasCompletedOnboarding: boolean;
  hasCompletedCrewSelection: boolean;
};

/**
 * Where a signed-in user must go next. `null` means they have everything
 * they need and can reach the home route.
 */
export function getPostAuthRedirect({
  hasCompletedOnboarding,
  hasCompletedCrewSelection,
}: GateInput): "/onboarding" | "/build-crew" | null {
  if (!hasCompletedOnboarding) return "/onboarding";
  if (!hasCompletedCrewSelection) return "/build-crew";
  return null;
}
