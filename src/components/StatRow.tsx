import { Text, View } from "react-native";

import { EditableNumberFlow } from "@/components/EditableAnimated";
import { EditableText } from "@/components/EditableText";
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

/** Card shell for a stack of `StatRow`s — flat fill only, no padding, since each row owns its own. */
export function StatCard({ children }: { children: React.ReactNode }) {
  return <View className="overflow-hidden rounded-2xl bg-surface">{children}</View>;
}

/** Plain "label ... value" row, divided from the next — the reference screenshot's core unit.
 * Pass `numericValue` for a headline number (e.g. a score) to roll it in via the app's standard
 * `NumberFlow` instead of static text — `value` still supplies the Dev Mode fallback string. */
export function StatRow({
  label,
  value,
  numericValue,
  valueColor,
  isLast,
  id,
}: {
  label: string;
  value: string;
  numericValue?: number;
  valueColor?: string;
  isLast?: boolean;
  /** Dev Mode override id (see EditableText) — omit to render the value as plain, non-editable text. */
  id?: string;
}) {
  return (
    <View className={`flex-row items-center justify-between px-4 py-3 ${!isLast ? "border-b border-divider" : ""}`}>
      <Text className="body-sm text-text-secondary">{label}</Text>
      {numericValue != null ? (
        <EditableNumberFlow id={id ?? label} value={numericValue} fontSize={13} fontWeight="700" color={valueColor ?? colors.neutral.textPrimary} />
      ) : id ? (
        <EditableText id={id} className="body-sm font-body-bold" style={{ color: valueColor ?? colors.neutral.textPrimary }}>
          {value}
        </EditableText>
      ) : (
        <Text className="body-sm font-body-bold" style={{ color: valueColor ?? colors.neutral.textPrimary }}>
          {value}
        </Text>
      )}
    </View>
  );
}
