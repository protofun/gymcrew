import { Modal, Pressable, Text, View } from "react-native";

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
 * tapped on the PWA. This is the cross-platform replacement, using the app's usual modal pattern
 * (backdrop Pressable + a no-op inner Pressable so taps on the card don't close it).
 */
export function ConfirmModal({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}
        onPress={onCancel}
      >
        <Pressable onPress={() => {}} className="gap-4 rounded-2xl border border-divider bg-surface p-5">
          <View className="gap-1.5">
            <Text className="heading-4 text-text-primary">{title}</Text>
            <Text className="body-sm text-text-secondary">{message}</Text>
          </View>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
