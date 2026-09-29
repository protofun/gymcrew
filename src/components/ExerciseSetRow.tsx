import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { buildNumberRange, NumberArcPickerModal } from "@/components/NumberArcPickerModal";
import { kgToLbs, lbsToKg } from "@/lib/units";
import type { LoggedSet, WeightUnit } from "@/store/active-workout-store";
import { colors, fontFamily } from "@/theme";

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
  // What WE last told the parent `weightKg` was, via typing, the arc picker, or the focus-fill below —
  // lets the sync effect tell "the parent echoed back what I just did" (skip, keep the user's own
  // in-progress text like a trailing "6.") apart from "something ELSE changed this set's weight" (an
  // external update — a set added elsewhere with a prefilled value, or the history picker dropping a
  // past number straight into this set — which does need the text to resync).
  const lastSentWeightKg = useRef(set.weightKg);

  // Tapping a number field opens its `ArcList` picker instead of the keyboard by default — "als ik op
  // een cijfer druk... dat de arc fan erin komt om zo makkelijk de nummers te swipen". Typing directly
  // is still fully available ("moet nog wel mogelijk zijn om ook met toetsenbord te doen"), one tap
  // further in via "Type manually", which flips this field into `editing` mode and focuses the real
  // `TextInput` underneath.
  const [weightPickerOpen, setWeightPickerOpen] = useState(false);
  const [weightEditing, setWeightEditing] = useState(false);
  const weightInputRef = useRef<TextInput>(null);
  const [repsPickerOpen, setRepsPickerOpen] = useState(false);
  const [repsEditing, setRepsEditing] = useState(false);
  const repsInputRef = useRef<TextInput>(null);

  // "–" rather than "0" when there's nothing to show — a placeholder "0" reads too easily as a real
  // (if unimpressive) entered value instead of "no data yet".
  const weightPlaceholder = previousSet?.weightKg != null ? formatWeight(previousSet.weightKg, unit) : "–";
  const repsPlaceholder = previousSet?.reps != null ? previousSet.reps.toString() : "–";

  useEffect(() => {
    if (set.weightKg === lastSentWeightKg.current) return;
    setWeightText(formatWeight(set.weightKg, unit));
    lastSentWeightKg.current = set.weightKg;
  }, [unit, set.id, set.weightKg]);

  function handleWeightChange(text: string) {
    setWeightText(text);
    const parsed = parseNumberInput(text);
    const weightKg = parsed === null ? null : unit === "lbs" ? lbsToKg(parsed) : parsed;
    lastSentWeightKg.current = weightKg;
    onUpdate({ weightKg });
  }

  // Tapping into a blank field commits last time's number immediately — no need to type the same
  // digits you're already looking at as a placeholder. Still fully editable from there.
  function handleWeightFocus() {
    if (set.weightKg === null && previousSet?.weightKg != null) {
      setWeightText(formatWeight(previousSet.weightKg, unit));
      lastSentWeightKg.current = previousSet.weightKg;
      onUpdate({ weightKg: previousSet.weightKg });
    }
  }

  function handleRepsFocus() {
    if (set.reps === null && previousSet?.reps != null) {
      onUpdate({ reps: previousSet.reps });
    }
  }

  // The wheel's range is fixed the moment it opens (captured into state right when each picker is
  // shown, below) and deliberately does NOT recompute from the live value while scrolling — `onIndexChange`
  // fires on every settle, which would otherwise re-centre (and, worse, `useMemo`-recreate) the range
  // out from under an in-progress swipe, snapping the wheel back to its middle instead of landing where
  // you actually let go.
  const [weightRangeBase, setWeightRangeBase] = useState<number | null>(null);
  const weightValues = useMemo(() => buildNumberRange(weightRangeBase ?? 60, 40, 60), [weightRangeBase]);
  const weightIndex = Math.max(0, weightValues.indexOf(Math.round(weightRangeBase ?? 60)));

  const [repsRangeBase, setRepsRangeBase] = useState<number | null>(null);
  const repsValues = useMemo(() => buildNumberRange(repsRangeBase ?? 8, 8, 20), [repsRangeBase]);
  const repsIndex = Math.max(0, repsValues.indexOf(Math.round(repsRangeBase ?? 8)));

  function openWeightPicker() {
    setWeightRangeBase(parseNumberInput(weightText) ?? (previousSet?.weightKg != null ? Number(formatWeight(previousSet.weightKg, unit)) : 60));
    setWeightPickerOpen(true);
  }

  function openRepsPicker() {
    setRepsRangeBase(set.reps ?? previousSet?.reps ?? 8);
    setRepsPickerOpen(true);
  }

  function applyWeightValue(display: number) {
    const weightKg = unit === "lbs" ? lbsToKg(display) : display;
    setWeightText(display.toString());
    lastSentWeightKg.current = weightKg;
    onUpdate({ weightKg });
  }

  // A completed set collapses to one compact line instead of the full editable row — once you've
  // hit a number there's rarely a reason to keep staring at two big input boxes for it. Tapping the
  // checkmark again reopens it for editing. Each branch below carries its own `key` so toggling
  // `set.completed` remounts rather than just re-rendering the same Pressable in place — that's what
  // makes the `entering`/`exiting` animations actually replay every time, not just on first mount.
  if (set.completed) {
    return (
      <Animated.View key="done" entering={ZoomIn.duration(220).easing(Easing.out(Easing.back(1.4)))} exiting={FadeOut.duration(120)}>
        <Pressable onPress={() => onUpdate({ completed: false })} style={{ backgroundColor: "rgba(74,222,128,0.16)", borderRadius: 16 }} className="flex-row items-center gap-2.5 px-3 py-2.5">
          <View style={{ backgroundColor: colors.semantic.success }} className="h-9 w-9 items-center justify-center rounded-full">
            <Ionicons name="checkmark" size={18} color={colors.brand.iron} />
          </View>
          <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.brand.white }} className="flex-1">
            {`${formatWeight(set.weightKg, unit) || "–"} ${unit} × ${set.reps ?? "–"}`}
          </Text>
          <Ionicons name="checkmark-circle" size={24} color={colors.semantic.success} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View key="editing" entering={FadeIn.duration(150)}>
      <View className="flex-row items-center gap-2.5 px-1">
        {/* Tap toggles warm-up. Removing a set is the separate, explicit ⊗ icon at the end of the
            row — this badge used to also remove on long-press, which was undocumented and an easy
            way to accidentally delete a set while adjusting warm-up state. */}
        <Pressable onPress={() => onUpdate({ isWarmup: !set.isWarmup })} hitSlop={6}>
          <View
            style={{ backgroundColor: set.isWarmup ? "transparent" : colors.neutral.surfaceElevated, borderWidth: set.isWarmup ? 1.5 : 0, borderColor: colors.semantic.warning }}
            className="h-9 w-9 items-center justify-center rounded-full"
          >
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 15, color: set.isWarmup ? colors.semantic.warning : colors.neutral.textSecondary }}>{set.isWarmup ? "W" : index}</Text>
          </View>
        </Pressable>

        {/* `minWidth` and `textAlign` must be inline, not the `min-w-0`/`text-center` classes.
            NativeWind (this project's preview version) doesn't reliably compile some properties
            on native — see theme/typography.ts for the same class of bug on `transform`/`font-style`.
            `textAlign` specifically crashes on native TextInput: react-native-css's TextInput wrapper
            declares `nativeStyleMapping: { textAlign: true }`, and its mapper unconditionally calls
            `path.split(".")` assuming a string, which throws on that literal `true`. */}
        <View style={{ flex: 1, position: "relative" }}>
          <TextInput
            ref={weightInputRef}
            value={weightText}
            onChangeText={handleWeightChange}
            onFocus={handleWeightFocus}
            onBlur={() => setWeightEditing(false)}
            keyboardType="decimal-pad"
            placeholder={weightPlaceholder}
            placeholderTextColor={colors.neutral.textSecondary}
            style={{ minWidth: 0, textAlign: "center", fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.brand.white, backgroundColor: colors.neutral.surfaceElevated, borderRadius: 14 }}
            className="px-3 py-2.5"
          />
          {/* A transparent tap-catcher over the field while it's in "picker" mode (the default) — it
              intercepts the tap before the `TextInput` underneath can claim it and open the keyboard,
              so tapping the number opens the arc picker first. It's gone entirely once `weightEditing`
              is true, so the real `TextInput` gets normal touch/focus/cursor behavior for typing. */}
          {!weightEditing && <Pressable onPress={openWeightPicker} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
        </View>

        <View style={{ flex: 1, position: "relative" }}>
          <TextInput
            ref={repsInputRef}
            value={set.reps?.toString() ?? ""}
            onChangeText={(text) => onUpdate({ reps: parseNumberInput(text) })}
            onFocus={handleRepsFocus}
            onBlur={() => setRepsEditing(false)}
            keyboardType="number-pad"
            placeholder={repsPlaceholder}
            placeholderTextColor={colors.neutral.textSecondary}
            style={{ minWidth: 0, textAlign: "center", fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.brand.white, backgroundColor: colors.neutral.surfaceElevated, borderRadius: 14 }}
            className="px-3 py-2.5"
          />
          {!repsEditing && <Pressable onPress={openRepsPicker} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
        </View>

        <Pressable onPress={() => onUpdate({ completed: true })} hitSlop={6} style={{ backgroundColor: colors.brand.yellow }} className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="checkmark" size={20} color={colors.brand.iron} />
        </Pressable>

        <Pressable onPress={onRemove} hitSlop={6} className="h-9 w-9 items-center justify-center">
          <Ionicons name="close-circle-outline" size={20} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <NumberArcPickerModal
        visible={weightPickerOpen}
        title={`WEIGHT (${unit.toUpperCase()})`}
        values={weightValues}
        initialIndex={weightIndex}
        onChangeIndex={(i) => applyWeightValue(weightValues[i])}
        onClose={() => setWeightPickerOpen(false)}
        onOpenKeyboard={() => {
          setWeightPickerOpen(false);
          setWeightEditing(true);
          // Deferred, not `requestAnimationFrame` — same race already documented elsewhere in this
          // file's history (`WorkoutLogger`'s note-editor): focusing in the same tick as the `Modal`
          // dismissing steals focus right back the instant it grabs it (confirmed here too — the
          // input never actually received focus until this was pushed out past the modal's own
          // teardown).
          setTimeout(() => weightInputRef.current?.focus(), 300);
        }}
      />

      <NumberArcPickerModal
        visible={repsPickerOpen}
        title="REPS"
        values={repsValues}
        initialIndex={repsIndex}
        onChangeIndex={(i) => onUpdate({ reps: repsValues[i] })}
        onClose={() => setRepsPickerOpen(false)}
        onOpenKeyboard={() => {
          setRepsPickerOpen(false);
          setRepsEditing(true);
          setTimeout(() => repsInputRef.current?.focus(), 300);
        }}
      />
    </Animated.View>
  );
}
