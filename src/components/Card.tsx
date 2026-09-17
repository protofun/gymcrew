import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { Pressable } from "@/components/ui/atoms/pressable";
import { radius } from "@/theme";

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  /** `"default"` — the app's standard card shell (border-divider, bg-surface), used by nearly
   * every Home/dashboard card. `"accent"` — the brand-yellow-tinted highlight variant
   * (`BiggestOpportunityCard`'s border-brand-yellow/30, bg-brand-yellow/5). */
  variant?: "default" | "accent";
  /** `"large"` (24px, the dominant convention) or `"medium"` (16px, used by the more compact
   * `CrewWarWidget`-style cards). */
  cornerRadius?: "large" | "medium";
  /** Layout classes only (margin, padding, flex-direction, gap) — the shell's border/bg classes
   * are fixed by `variant` and always included. */
  className?: string;
  style?: ViewStyle;
};

const SHELL: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "overflow-hidden border border-divider bg-surface",
  accent: "overflow-hidden border border-brand-yellow/30 bg-brand-yellow/5",
};

/**
 * Shared shell for the ~6 Home/dashboard cards that were each hand-rolling the identical
 * `rounded-3xl border border-divider bg-surface` combination (`CrewCard`, `HomeNutritionWidget`,
 * `LastWorkoutWidget`, `MuscleSuggestions`) or a close variant of it (`BiggestOpportunityCard`'s
 * accent tint, `CrewWarWidget`'s tighter radius). Not a Reacticx component itself — no generic
 * Card primitive exists in the real registry (see GYMCREW_REACTICX_COMPONENT_MAP.md) — but built
 * on Reacticx's `atoms/pressable` when `onPress` is given, so every tappable card now gets a real
 * press-scale animation for free instead of the flat `opacity: pressed ? 0.85 : 1` every one of
 * these previously implemented by hand.
 */
export function Card({ children, onPress, variant = "default", cornerRadius = "large", className = "", style }: CardProps) {
  const shellStyle = { borderRadius: cornerRadius === "large" ? radius.large : radius.medium };
  const merged = `${SHELL[variant]} ${className}`.trim();

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={style}>
        <View className={merged} style={shellStyle}>
          {children}
        </View>
      </Pressable>
    );
  }

  return (
    <View className={merged} style={[shellStyle, style]}>
      {children}
    </View>
  );
}
