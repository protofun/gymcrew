import type { WeightUnit } from "@/store/active-workout-store";

const KG_TO_LBS = 2.20462;

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / KG_TO_LBS) * 10) / 10;
}

/**
 * Every weight in the app is stored in kg (workouts, records, body weight, rank math) — this is the
 * single conversion point for showing a stored kg value in the user's chosen display unit
 * (onboarding-store.ts's `weightUnit`). Use this (or `formatWeight` below) instead of showing a raw
 * kg number directly, so the Profile → Units toggle actually changes what's on screen everywhere.
 */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === "lbs" ? kgToLbs(kg) : Math.round(kg * 10) / 10;
}

/** "225 lbs" / "12,500 kg" — `displayWeight` converted and formatted with its unit label, with a
 * thousands separator for large numbers (e.g. total volume) and no pointless trailing ".0" for
 * whole numbers. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = displayWeight(kg, unit);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
}
