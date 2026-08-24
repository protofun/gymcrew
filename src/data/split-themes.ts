import { DIVISION_COLOR, type Division } from "@/lib/division";
import { colors } from "@/theme";

/**
 * Functional division-leveling reward: alternate accent colors for the Workout Split page, unlocked
 * as the user's personal division climbs — or bought early with tokens from the Store (see
 * store/theme-store.ts's `purchasedThemeKeys`). Colors are borrowed straight from DIVISION_COLOR so a
 * theme visually previews the division badge that unlocks it.
 */
export type SplitTheme = { key: string; label: string; color: string; unlockDivision: Division; earlyUnlockCost: number };

export const SPLIT_THEMES: SplitTheme[] = [
  { key: "yellow", label: "Iron Yellow", color: colors.brand.yellow, unlockDivision: "Rookie", earlyUnlockCost: 0 },
  { key: "bronze", label: "Bronze Steel", color: DIVISION_COLOR.Bronze, unlockDivision: "Bronze", earlyUnlockCost: 15 },
  { key: "ice", label: "Diamond Ice", color: DIVISION_COLOR.Diamond, unlockDivision: "Diamond", earlyUnlockCost: 25 },
  { key: "violet", label: "Elite Violet", color: DIVISION_COLOR.Elite, unlockDivision: "Elite", earlyUnlockCost: 35 },
  { key: "crimson", label: "Master Crimson", color: DIVISION_COLOR.Master, unlockDivision: "Master", earlyUnlockCost: 50 },
];

export const DEFAULT_SPLIT_THEME = SPLIT_THEMES[0];
