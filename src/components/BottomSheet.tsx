import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Auto-sizes to content height by default — right for the short option lists most of this
   * app's sheets show. Pass explicit snap points (e.g. `["50%", "90%"]`) only for a sheet that
   * needs to be resizable or taller than its content. */
  snapPoints?: (string | number)[];
  /** Caps auto-sizing at this height (px), scrolling internally past it — for a sheet whose
   * content is a variable-length scrollable list that should stay compact when short but not grow
   * unbounded when long. Ignored when `snapPoints` is set. */
  maxDynamicContentSize?: number;
  /** Lets the sheet ride up above the keyboard — turn on for any sheet with a `TextInput` inside. */
  keyboardAware?: boolean;
};

/** The one reusable bottom-sheet shell (dark card, rounded top corners, drag handle, dimmed
 * backdrop, swipe-to-dismiss) — built on `@gorhom/bottom-sheet` so every sheet in the app gets
 * real drag-to-dismiss and, when `keyboardAware` is on, correct keyboard avoidance for free,
 * instead of each screen re-implementing its own `Modal` + `Pressable` backdrop + slide-in
 * animation. Keeps the same `visible`/`onClose` shape the old hand-rolled sheets used, so callers
 * barely change.
 *
 * Two web-only quirks (confirmed empirically, not documented upstream) drive the state machine
 * below:
 * 1. `.dismiss()` on a sheet that was never `.present()`-ed corrupts its internal status, so every
 *    later `.present()` silently no-ops — never call `dismiss()` before a real `present()` has
 *    happened.
 * 2. Even a *legitimate* `.dismiss()` leaves the sheet unable to `.present()` again on web (a
 *    stale-closure-style issue inside the library's own modal-status machine). Forcing a fresh
 *    `BottomSheetModal` instance (via `key`) on every open sidesteps it entirely — each `present()`
 *    always targets a brand-new instance that's never been dismissed. */
export function BottomSheet({ visible, onClose, children, snapPoints, maxDynamicContentSize, keyboardAware }: BottomSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [openCount, setOpenCount] = useState(0);
  const everPresented = useRef(false);
  // Set right before `onClose` fires from the library's own dismiss (backdrop tap / swipe down /
  // programmatic close already in flight) — skips a redundant extra `.dismiss()` call from the
  // effect below for a close that's already happening.
  const dismissedByLibrary = useRef(false);

  useEffect(() => {
    if (visible) {
      setOpenCount((count) => count + 1);
    } else if (everPresented.current && !dismissedByLibrary.current) {
      ref.current?.dismiss();
    }
    dismissedByLibrary.current = false;
  }, [visible]);

  // Runs after the `key` bump above has already remounted the modal, so `ref.current` here always
  // points at a fresh, never-dismissed instance (see quirk 2 above).
  useEffect(() => {
    if (openCount > 0) {
      ref.current?.present();
      everPresented.current = true;
    }
  }, [openCount]);

  const handleDismiss = useCallback(() => {
    dismissedByLibrary.current = true;
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      key={openCount}
      ref={ref}
      onDismiss={handleDismiss}
      enableDynamicSizing={!snapPoints}
      snapPoints={snapPoints}
      maxDynamicContentSize={maxDynamicContentSize}
      backdropComponent={renderBackdrop}
      keyboardBehavior={keyboardAware ? "interactive" : "fillParent"}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: colors.neutral.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      style={{ borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.neutral.divider, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.neutral.divider, width: 40 }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom + 8 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
}
