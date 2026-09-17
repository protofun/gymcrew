import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { StaggeredText } from "@/components/ui/organisms/animated-text";
import type { AppNotification } from "@/data/notifications";
import { useNotificationsStore } from "@/store/notifications-store";
import { colors, fontFamily } from "@/theme";

const AVATAR_SIZE = 36;
const BELL_SIZE = 18;

// StaggeredText's default blur-reveal doesn't render correctly on web (expo-blur's animated
// intensity misbehaves there) — disabled, keeping only the fade/slide/scale reveal.
const NO_BLUR = { maxBlurIntensity: 0 };

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
  const readIds = useNotificationsStore((state) => state.readIds);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const hasUnreadNotifications = notifications.some((notification) => !readIds.includes(notification.id));

  function toggleNotifications() {
    setNotificationsOpen((open) => {
      if (!open) markAllRead(notifications.map((notification) => notification.id));
      return !open;
    });
  }

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
            onPress={toggleNotifications}
            hitSlop={4}
            className="items-center justify-center rounded-full border border-divider bg-background p-2"
          >
            <Ionicons name="notifications-outline" size={BELL_SIZE} color={colors.neutral.textPrimary} />
            {hasUnreadNotifications && <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />}
          </Pressable>
        </View>

        {/* Absolutely centered on the full row so it stays put regardless of how wide the side content is. */}
        <View pointerEvents="none" className="absolute inset-0 flex-row items-center justify-center">
          <StaggeredText text="GYM" style={[wordmarkStyle, { color: colors.neutral.textPrimary }]} animationConfig={NO_BLUR} />
          <StaggeredText text="CREW" style={[wordmarkStyle, { color: colors.brand.yellow }]} animationConfig={{ ...NO_BLUR, characterDelay: 40 }} />
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
