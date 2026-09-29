import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text } from "react-native";
import Animated, { Easing, ZoomIn } from "react-native-reanimated";

import { ArcList } from "@/components/ui/molecules/arc-list";
import { colors, fontFamily } from "@/theme";

// Same generous sizing `AddGoalModal`'s own `ArcList` uses (its own comment in AGENTS.md: a small
// `itemHeight` or a longer label overlaps its neighbour) — proven not to overlap, not re-tuned here.
const ARC_HEIGHT = 260;
const ARC_ITEM_HEIGHT = 96;
const ARC_SWEEP = 10;
const ARC_STYLE = { flexGrow: 0, flexShrink: 0, flexBasis: "auto" } as const;

/** A contiguous run of whole numbers, centered on `center` — e.g. `buildNumberRange(80, 40, 60)`
 * gives every integer from 40 to 140. `before`/`after` are deliberately asymmetric (more room above
 * than below) since progressing a lift upward from wherever you last left it is the far more common
 * direction to scroll toward. */
export function buildNumberRange(center: number, before: number, after: number): number[] {
  const start = Math.max(0, Math.round(center) - before);
  const end = Math.round(center) + after;
  const values: number[] = [];
  for (let v = start; v <= end; v++) values.push(v);
  return values;
}

/** The real Reacticx `arc-list` (reacticx.com/components/arc-list) — a swipeable, snapping wheel of
 * numbers — not a hand-rolled substitute. Any weight/reps field that wants "tap the number to open a
 * quick wheel instead of jumping straight to the keyboard" opens this in a small centered `Modal`
 * (the Style Exception List's one approved way to escape the surrounding layout) instead of inline
 * under the field: a real `ArcList` at its own proven, non-overlapping size (`AddGoalModal`'s own
 * 260/96/10) is taller than most fields have room for below them without risking spilling past the
 * bottom of the screen depending on where that field sits — centering it in a `Modal` sidesteps
 * needing to know the field's on-screen position at all. Swiping through the wheel updates the value
 * live via `onIndexChange`; "Type manually" underneath is the escape hatch to the real keyboard,
 * since typing an exact number must stay possible.
 *
 * No boxed card behind the wheel — "het hoeft ook niet in een card, je kan ook alles blurren behalve
 * de cijfers." A true gaussian blur isn't available here: `expo-blur` is explicitly not in this app's
 * native build (see AGENTS.md's Reacticx section — every vendored component that touched it had that
 * import patched out), and reaching for a different blur library would need approval before adding a
 * new native dependency. Instead the backdrop is a strong, near-opaque scrim close to the app's own
 * `background` color — the screen behind genuinely dissolves toward black rather than sitting behind
 * a translucent card, and the wheel's own light numbers are the only thing that reads clearly on top,
 * which is the same practical effect for a picker like this one. The scrim fades in on its own
 * (`Modal`'s `animationType="fade"`), and the wheel + label + keypad group gets its own quick
 * `ZoomIn` pop distinct from that fade — the "animatie" the ask also mentioned.
 *
 * Shared by `ExerciseSetRow.tsx` (logging a set mid-workout) and `whats-my-rank.tsx`'s `LogStep`
 * (the hypothetical weight/reps entry) — extracted here the moment a second real caller showed up,
 * per this repo's own "refactor only when repetition appears" rule. */
export function NumberArcPickerModal({
  visible,
  title,
  values,
  initialIndex,
  onChangeIndex,
  onClose,
  onOpenKeyboard,
}: {
  visible: boolean;
  title: string;
  values: number[];
  initialIndex: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  onOpenKeyboard: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(13,17,23,0.94)" }} onPress={onClose} className="items-center justify-center">
        {/* An inner `Pressable` with no real action of its own — its only job is to claim the touch so
            tapping this group doesn't bubble to the backdrop `Pressable` behind it and close the modal
            (the same "innermost `Pressable` wins" responder behavior AGENTS.md already documents
            elsewhere, used here on purpose instead of worked around). */}
        <Animated.View entering={ZoomIn.duration(220).easing(Easing.out(Easing.back(1.2)))}>
          <Pressable onPress={() => {}} className="items-center gap-2">
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.neutral.textSecondary }}>{title}</Text>
            <ArcList.Root
              height={ARC_HEIGHT}
              style={ARC_STYLE}
              itemHeight={ARC_ITEM_HEIGHT}
              sweep={ARC_SWEEP}
              side="left"
              snap
              haptics
              defaultIndex={initialIndex}
              onIndexChange={onChangeIndex}
            >
              <ArcList.Viewport>
                {values.map((value) => (
                  <ArcList.Item key={value}>
                    <ArcList.Label color={colors.neutral.textSecondary} activeColor={colors.brand.white} style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1 }}>
                      {value}
                    </ArcList.Label>
                  </ArcList.Item>
                ))}
              </ArcList.Viewport>
            </ArcList.Root>

            <Pressable onPress={onOpenKeyboard} hitSlop={8} className="flex-row items-center gap-1.5 pt-1">
              <Ionicons name="keypad-outline" size={15} color={colors.brand.yellow} />
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.brand.yellow }}>Type manually</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
