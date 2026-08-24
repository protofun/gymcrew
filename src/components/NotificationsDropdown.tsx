import { router } from "expo-router";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import type { AppNotification } from "@/data/notifications";

type NotificationsDropdownProps = {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  /** Distance from the top of the screen to anchor the dropdown under the bell. */
  topOffset: number;
};

export function NotificationsDropdown({ visible, onClose, notifications, topOffset }: NotificationsDropdownProps) {
  function handlePress(notification: AppNotification) {
    onClose();
    if (notification.workoutId) {
      router.push({ pathname: "/workout/summary", params: { id: notification.workoutId } });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          style={{ position: "absolute", top: topOffset, right: 16, width: 300, maxHeight: 360 }}
        >
          {/* Swallows taps so they don't bubble to the backdrop Pressable and close the dropdown. */}
          <Pressable onPress={() => {}} className="gap-3 rounded-2xl border border-divider bg-surface p-4">
            <Text className="heading-4 text-text-primary">Notifications</Text>

            {notifications.length === 0 ? (
              <Text className="body-md text-text-secondary">You don&apos;t have any notifications yet.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {notifications.map((notification) => (
                    <Pressable
                      key={notification.id}
                      onPress={() => handlePress(notification)}
                      disabled={!notification.workoutId}
                      style={({ pressed }) => ({ opacity: pressed && notification.workoutId ? 0.7 : 1 })}
                      className="flex-row items-start gap-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
                        <Image source={notification.icon} resizeMode="contain" style={{ width: 26, height: 26 }} />
                      </View>
                      <View className="flex-1 gap-0.5 pt-1">
                        <Text className="body-md text-text-primary">{notification.title}</Text>
                        <Text className="caption text-text-secondary">{notification.time}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
