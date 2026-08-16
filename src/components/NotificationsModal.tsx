import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import type { AppNotification } from "@/data/notifications";
import { colors } from "@/theme";

type NotificationsModalProps = {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
};

export function NotificationsModal({ visible, onClose, notifications }: NotificationsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-6"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <Text className="heading-4 text-text-primary">Notifications</Text>

          {notifications.length === 0 ? (
            <Text className="body-md text-text-secondary">You don&apos;t have any notifications yet.</Text>
          ) : (
            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                {notifications.map((notification) => (
                  <View key={notification.id} className="flex-row items-start gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
                      <Ionicons name={notification.icon} size={16} color={colors.brand.yellow} />
                    </View>
                    <View className="flex-1 gap-0.5 pt-1">
                      <Text className="body-md text-text-primary">{notification.title}</Text>
                      <Text className="caption text-text-secondary">{notification.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
