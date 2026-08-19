import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { kgToLbs, lbsToKg } from "@/lib/units";
import type { LoggedSet, WeightUnit } from "@/store/active-workout-store";
import { colors } from "@/theme";

type ExerciseSetRowProps = {
  index: number;
  set: LoggedSet;
  unit: WeightUnit;
  /** What you logged for this same set number last time you did this exercise, if any — shown as
   * a placeholder so there's a target to beat instead of a bare "0". */
  previousSet: LoggedSet | null;
  onUpdate: (updates: Partial<Omit<LoggedSet, "id">>) => void;
  onRemove: () => void;
};

function parseNumberInput(text: string): number | null {
  if (text.trim() === "") return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatWeight(weightKg: number | null, unit: WeightUnit): string {
  if (weightKg === null) return "";
  return (unit === "lbs" ? kgToLbs(weightKg) : weightKg).toString();
}

export function ExerciseSetRow({ index, set, unit, previousSet, onUpdate, onRemove }: ExerciseSetRowProps) {
  // Local draft, resynced from the canonical kg value whenever the unit toggles OR the underlying
  // set itself changes (e.g. auto-filled from the set above when this row is first added) — not on
  // every keystroke, so typing a multi-digit weight doesn't visibly drift from repeated kg<->lbs
  // rounding.
  const [weightText, setWeightText] = useState(() => formatWeight(set.weightKg, unit));

  // "–" rather than "0" when there's nothing to show — a placeholder "0" reads too easily as a real
  // (if unimpressive) entered value instead of "no data yet".
  const weightPlaceholder = previousSet?.weightKg != null ? formatWeight(previousSet.weightKg, unit) : "–";
  const repsPlaceholder = previousSet?.reps != null ? previousSet.reps.toString() : "–";

  useEffect(() => {
    setWeightText(formatWeight(set.weightKg, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, set.id]);

  function handleWeightChange(text: string) {
    setWeightText(text);
    const parsed = parseNumberInput(text);
    const weightKg = parsed === null ? null : unit === "lbs" ? lbsToKg(parsed) : parsed;
    onUpdate({ weightKg });
  }

  return (
    <View
      className={`flex-row items-center gap-2.5 rounded-xl px-2.5 py-2.5 ${set.completed ? "bg-success/25" : ""}`}
    >
      {/* Tap toggles warm-up, long-press removes the set — same badge doubles as both controls. */}
      <Pressable onPress={() => onUpdate({ isWarmup: !set.isWarmup })} onLongPress={onRemove} hitSlop={6}>
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${
            set.completed ? "bg-success" : set.isWarmup ? "bg-transparent" : "bg-background"
          }`}
          style={set.isWarmup && !set.completed ? { borderWidth: 1.5, borderColor: colors.semantic.warning } : undefined}
        >
          <Text
            className={`body-md font-body-semibold ${set.completed ? "text-brand-iron" : !set.isWarmup ? "text-text-secondary" : ""}`}
            style={set.isWarmup && !set.completed ? { color: colors.semantic.warning } : undefined}
          >
            {set.isWarmup ? "W" : index}
          </Text>
        </View>
      </Pressable>

      {/* `minWidth` and `textAlign` must be inline, not the `min-w-0`/`text-center` classes.
          NativeWind (this project's preview version) doesn't reliably compile some properties
          on native — see theme/typography.ts for the same class of bug on `transform`/`font-style`.
          `textAlign` specifically crashes on native TextInput: react-native-css's TextInput wrapper
          declares `nativeStyleMapping: { textAlign: true }`, and its mapper unconditionally calls
          `path.split(".")` assuming a string, which throws on that literal `true`. */}
      <TextInput
        value={weightText}
        onChangeText={handleWeightChange}
        keyboardType="decimal-pad"
        placeholder={weightPlaceholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className={`body-md flex-1 rounded-xl px-3 py-3 text-text-primary ${set.completed ? "bg-success/30" : "bg-background"}`}
        style={{ minWidth: 0, textAlign: "center" }}
      />

      <TextInput
        value={set.reps?.toString() ?? ""}
        onChangeText={(text) => onUpdate({ reps: parseNumberInput(text) })}
        keyboardType="number-pad"
        placeholder={repsPlaceholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className={`body-md flex-1 rounded-xl px-3 py-3 text-text-primary ${set.completed ? "bg-success/30" : "bg-background"}`}
        style={{ minWidth: 0, textAlign: "center" }}
      />

      <Pressable
        onPress={() => onUpdate({ completed: !set.completed })}
        hitSlop={6}
        className={`h-9 w-9 items-center justify-center rounded-full ${
          set.completed ? "bg-success" : "border border-divider"
        }`}
      >
        <Ionicons name="checkmark" size={18} color={set.completed ? colors.brand.iron : colors.neutral.textSecondary} />
      </Pressable>

      <Pressable onPress={onRemove} hitSlop={6} className="h-9 w-9 items-center justify-center">
        <Ionicons name="close-circle-outline" size={20} color={colors.neutral.textSecondary} />
      </Pressable>
    </View>
  );
}
