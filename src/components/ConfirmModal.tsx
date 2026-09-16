import { Pressable, Text, View } from "react-native";

import { Dialog } from "@/components/ui/primitives/dialog";
import { colors, radius } from "@/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * `Alert.alert` with multiple buttons doesn't reliably render on React Native Web — no dialog ever
 * appears, so a destructive confirm (Sign Out, Delete Account, ...) silently does nothing when
 * tapped on the PWA. This is the cross-platform replacement.
 *
 * Built on Reacticx's `Dialog` primitive (blur/scrim backdrop, flip-in animation) in controlled
 * mode — `visible` drives `Dialog.Root`'s `open`, and closing via the backdrop routes through
 * `onOpenChange` to the same `onCancel` the Cancel button calls. `Dialog.Close` isn't used for
 * either button: its `asChild` clone overwrites `onPress` with its own close handler, which would
 * silently drop `onConfirm` — so both buttons stay plain `Pressable`s and the parent still decides
 * when `visible` flips back to `false`, exactly like before.
 */
export function ConfirmModal({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Dialog.Root open={visible} onOpenChange={(open) => !open && onCancel()} theme="dark">
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content style={{ backgroundColor: colors.neutral.surface, borderColor: colors.neutral.divider, borderRadius: radius.medium }}>
          <Dialog.Header>
            <Text className="heading-4 text-text-primary">{title}</Text>
            <Text className="body-sm text-text-secondary">{message}</Text>
          </Dialog.Header>
          <View className="flex-row gap-3">
            <Pressable onPress={onCancel} className="flex-1 items-center rounded-full border border-divider py-3.5">
              <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`flex-1 items-center rounded-full py-3.5 ${destructive ? "bg-error" : "bg-brand-yellow"}`}
            >
              <Text className={`body-md font-body-semibold ${destructive ? "text-brand-white" : "text-brand-iron"}`}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
