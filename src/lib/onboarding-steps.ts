/** The order of the sign-up wizard, for the progress bar at the top of each step. Reordering the flow
 * only means reordering this list. */
const ONBOARDING_STEPS = [
  "welcome",
  "personal-info",
  "your-stats",
  "your-goal",
  "training-experience",
  "your-metrics",
  "rank-reveal",
  "workout-preferences",
  "training-schedule",
  "notifications",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** 0–1: how far through the wizard this step is (the step itself counts as done). */
export function onboardingProgress(step: OnboardingStep): number {
  return (ONBOARDING_STEPS.indexOf(step) + 1) / ONBOARDING_STEPS.length;
}

const CREW_STEPS = ["choose-path", "join-or-create", "settings", "ready"] as const;

export type CrewStep = (typeof CREW_STEPS)[number];

/** Same for the "build your crew" flow that follows the wizard. */
export function crewProgress(step: CrewStep): number {
  return (CREW_STEPS.indexOf(step) + 1) / CREW_STEPS.length;
}
