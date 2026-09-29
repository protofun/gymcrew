import type { ReactNode } from "react";
import { View } from "react-native";

/** Two of Home's flowing-list rows side by side instead of stacked — a thin vertical rule between them, the same bottom
 * hairline the single-column rows use underneath both, no boxed card around either half. Each half stays independently
 * pressable (it wraps its own `Pressable`, not this component) — this just lays the two out and draws the rule. */
export function HomeRowPair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <View className="flex-row border-b border-divider py-4">
      <View className="flex-1 pr-4">{left}</View>
      <View className="w-px bg-divider" />
      <View className="flex-1 pl-4">{right}</View>
    </View>
  );
}
