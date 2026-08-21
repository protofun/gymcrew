import { Text, View } from "react-native";

import { colors } from "@/theme";

/** Uppercase, letter-spaced category label above a `StatCard` — the "LIVE TRADING ACCOUNT" style
 * header from the reference screenshot, reused across every data-dense stats page in the app. */
export function StatSectionHeader({ label }: { label: string }) {
  return (
    <Text className="caption px-1 font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
      {label.toUpperCase()}
    </Text>
  );
}

/** Card shell for a stack of `StatRow`s — border/bg only, no padding, since each row owns its own. */
export function StatCard({ children }: { children: React.ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-divider bg-surface">{children}</View>;
}

/** Plain "label ... value" row, divided from the next — the reference screenshot's core unit. */
export function StatRow({ label, value, valueColor, isLast }: { label: string; value: string; valueColor?: string; isLast?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between px-4 py-3 ${!isLast ? "border-b border-divider" : ""}`}>
      <Text className="body-sm text-text-secondary">{label}</Text>
      <Text className="body-sm font-body-bold" style={{ color: valueColor ?? colors.neutral.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}
