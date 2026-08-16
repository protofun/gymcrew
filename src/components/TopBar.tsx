import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProgressBar } from "@/components/ProgressBar";
import { colors } from "@/theme";

const AVATAR_SIZE = 44;

const AVATAR_GLOW = Platform.select({
  ios: {
    shadowColor: colors.brand.yellow,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  default: { elevation: 6 },
});

function StatPill({ icon, color, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="body-md text-text-primary">{value}</Text>
    </View>
  );
}

type TopBarProps = {
  avatarSource: ImageSourcePropType;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  crewSize: number;
  hasUnreadNotifications?: boolean;
  onPressProgress?: () => void;
  onPressNotifications?: () => void;
};

export function TopBar({
  avatarSource,
  level,
  xp,
  xpToNextLevel,
  streakDays,
  crewSize,
  hasUnreadNotifications,
  onPressProgress,
  onPressNotifications,
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top + 10 }}
      className="flex-row items-center gap-3 border-b border-divider bg-surface px-4 pb-3"
    >
      <Pressable onPress={onPressProgress} hitSlop={4}>
        <View style={AVATAR_GLOW}>
          <Image
            source={avatarSource}
            className="border-2 border-brand-yellow"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          />
        </View>
        <View className="absolute -bottom-1 -right-1 min-w-[20px] items-center justify-center rounded-full border border-surface bg-brand-yellow px-1">
          <Text className="caption text-brand-iron">{level}</Text>
        </View>
      </Pressable>

      <Pressable onPress={onPressProgress} hitSlop={8} className="flex-1 gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="caption text-text-secondary">XP</Text>
          <Text className="caption text-text-secondary">
            {xp.toLocaleString("en-US")} / {xpToNextLevel.toLocaleString("en-US")}
          </Text>
        </View>
        <ProgressBar ratio={xpToNextLevel > 0 ? xp / xpToNextLevel : 0} color={colors.brand.yellow} />
      </Pressable>

      <StatPill icon="flame" color={colors.semantic.streak} value={streakDays} />
      <StatPill icon="people" color={colors.semantic.info} value={crewSize} />

      <Pressable
        onPress={onPressNotifications}
        className="items-center justify-center rounded-full border border-divider bg-background p-2"
      >
        <Ionicons name="notifications-outline" size={18} color={colors.neutral.textPrimary} />
        {hasUnreadNotifications && <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />}
      </Pressable>
    </View>
  );
}
