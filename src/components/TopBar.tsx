import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import type { AppNotification } from "@/data/notifications";
import { colors, fontFamily } from "@/theme";

const AVATAR_SIZE = 36;
const BELL_SIZE = 18;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style`
// onto native when combined with a sibling className (see typography.ts).
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 22,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

type TopBarProps = {
  avatarSource: ImageSourcePropType;
  streakDays: number;
  notifications: AppNotification[];
};

export function TopBar({ avatarSource, streakDays, notifications }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const hasUnreadNotifications = notifications.length > 0;

  return (
    <View style={{ paddingTop: insets.top + 10, zIndex: 20 }} className="border-b border-divider bg-surface px-4 pb-3">
      <View className="relative flex-row items-center justify-between">
        <Pressable onPress={() => router.push("/profile")} hitSlop={8}>
          <Image
            source={avatarSource}
            className="border-2 border-brand-yellow"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="flame" size={18} color={colors.semantic.streak} />
            <Text className="body-md text-text-primary">{streakDays}</Text>
          </View>

          <Pressable
            onPress={() => setNotificationsOpen((open) => !open)}
            hitSlop={4}
            className="items-center justify-center rounded-full border border-divider bg-background p-2"
          >
            <Ionicons name="notifications-outline" size={BELL_SIZE} color={colors.neutral.textPrimary} />
            {hasUnreadNotifications && <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />}
          </Pressable>
        </View>

        {/* Absolutely centered on the full row so it stays put regardless of how wide the side content is. */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text style={wordmarkStyle}>
            <Text className="text-text-primary">GYM</Text>
            <Text className="text-brand-yellow">CREW</Text>
          </Text>
        </View>
      </View>

      <NotificationsDropdown
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        topOffset={insets.top + 10 + AVATAR_SIZE + 20}
      />
    </View>
  );
}
