import { useOnboardingStore } from "@/store/onboarding-store";

/** The user's chosen display unit (Profile → Units) — every weight is stored in kg; use this with
 * `lib/units.ts`'s `formatWeight`/`displayWeight` to show it the way the user actually wants. */
export function useWeightUnit() {
  return useOnboardingStore((state) => state.weightUnit);
}
