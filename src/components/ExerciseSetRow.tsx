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

  // Tapping into a blank field commits last time's number immediately — no need to type the same
  // digits you're already looking at as a placeholder. Still fully editable from there.
  function handleWeightFocus() {
    if (set.weightKg === null && previousSet?.weightKg != null) {
      setWeightText(formatWeight(previousSet.weightKg, unit));
      onUpdate({ weightKg: previousSet.weightKg });
    }
  }

  function handleRepsFocus() {
    if (set.reps === null && previousSet?.reps != null) {
      onUpdate({ reps: previousSet.reps });
    }
  }

  // A completed set collapses to one compact line instead of the full editable row — once you've
  // hit a number there's rarely a reason to keep staring at two big input boxes for it. Tapping the
  // checkmark again reopens it for editing.
  if (set.completed) {
    return (
      <Pressable
        onPress={() => onUpdate({ completed: false })}
        className="flex-row items-center gap-2.5 rounded-xl bg-success/15 px-2.5 py-2"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-success">
          <Ionicons name="checkmark" size={16} color={colors.brand.iron} />
        </View>
        <Text className="body-md flex-1 font-body-semibold text-text-primary">
          {formatWeight(set.weightKg, unit) || "–"} {unit} × {set.reps ?? "–"}
        </Text>
        <Ionicons name="checkmark-circle" size={22} color={colors.semantic.success} />
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-2.5 rounded-xl px-2.5 py-1.5">
      {/* Tap toggles warm-up. Removing a set is the separate, explicit ⊗ icon at the end of the
          row — this badge used to also remove on long-press, which was undocumented and an easy
          way to accidentally delete a set while adjusting warm-up state. */}
      <Pressable onPress={() => onUpdate({ isWarmup: !set.isWarmup })} hitSlop={6}>
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${set.isWarmup ? "bg-transparent" : "bg-background"}`}
          style={set.isWarmup ? { borderWidth: 1.5, borderColor: colors.semantic.warning } : undefined}
        >
          <Text
            className={`body-md font-body-semibold ${!set.isWarmup ? "text-text-secondary" : ""}`}
            style={set.isWarmup ? { color: colors.semantic.warning } : undefined}
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
        onFocus={handleWeightFocus}
        keyboardType="decimal-pad"
        placeholder={weightPlaceholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md flex-1 rounded-xl bg-background px-3 py-2 text-text-primary"
        style={{ minWidth: 0, textAlign: "center" }}
      />

      <TextInput
        value={set.reps?.toString() ?? ""}
        onChangeText={(text) => onUpdate({ reps: parseNumberInput(text) })}
        onFocus={handleRepsFocus}
        keyboardType="number-pad"
        placeholder={repsPlaceholder}
        placeholderTextColor={colors.neutral.textSecondary}
        className="body-md flex-1 rounded-xl bg-background px-3 py-2 text-text-primary"
        style={{ minWidth: 0, textAlign: "center" }}
      />

      <Pressable
        onPress={() => onUpdate({ completed: true })}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-full border border-divider"
      >
        <Ionicons name="checkmark" size={18} color={colors.neutral.textSecondary} />
      </Pressable>

      <Pressable onPress={onRemove} hitSlop={6} className="h-9 w-9 items-center justify-center">
        <Ionicons name="close-circle-outline" size={20} color={colors.neutral.textSecondary} />
      </Pressable>
    </View>
  );
}
