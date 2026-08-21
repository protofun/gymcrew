import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { DivisionBadge } from "@/components/DivisionBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { images } from "@/constants/images";
import { DIVISION_COLOR, xpRequiredFor } from "@/lib/division";
import { realMemberStats } from "@/lib/member-real-profile";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 22,
  lineHeight: 24,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

// Same accent-bar-card language as ChallengeCard on the crew page's Challenges tab — a colored
// strip down the left edge, a bold skewed title, a stat pill, and a progress bar underneath.
const cardTitleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

type SettingsRoute =
  | "/profile/edit"
  | "/profile/units"
  | "/profile/notifications"
  | "/profile/subscription"
  | "/profile/account"
  | "/profile/achievements"
  | "/profile/history"
  | "/profile/body-log"
  | "/profile/rank-history"
  | "/profile/all-stats"
  | "/crew/settings";

type ProgressCard = { icon: keyof typeof Ionicons.glyphMap; label: string; caption: string; route: SettingsRoute | "/(tabs)/ranks" };

function SettingsRow({
  icon,
  label,
  value,
  danger,
  isLast,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={PRESSED_STYLE}
      className={`flex-row items-center gap-3 px-4 py-4 ${!isLast ? "border-b border-divider" : ""}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
        <Ionicons name={icon} size={16} color={danger ? colors.semantic.error : colors.neutral.textSecondary} />
      </View>
      <Text className={`body-md flex-1 font-body-semibold ${danger ? "text-error" : "text-text-primary"}`}>{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {value && <Text className="body-sm text-text-secondary">{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={danger ? colors.semantic.error : colors.neutral.textSecondary} />
      </View>
    </Pressable>
  );
}

function QuickStat({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string }) {
  return (
    <View className="flex-1 flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface">
      <View style={{ width: 3, backgroundColor: accent }} />
      <View className="flex-1 items-center gap-1 py-3">
        <Ionicons name={icon} size={14} color={accent} />
        <Text className="heading-4 text-text-primary">{value}</Text>
        <Text className="caption text-text-secondary">{label}</Text>
      </View>
    </View>
  );
}

function ProgressCardTile({ card, caption, onPress }: { card: ProgressCard; caption: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={PRESSED_STYLE} className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-4">
      <Ionicons name={card.icon} size={18} color={colors.brand.yellow} />
      <Text className="body-md font-body-semibold text-text-primary">{card.label}</Text>
      <Text className="caption text-text-secondary" numberOfLines={2}>
        {caption}
      </Text>
    </Pressable>
  );
}

/** Paired rows instead of a `flex-wrap` grid with percentage widths — `flex-1` siblings divide the
 * row exactly (no rounding gaps between card and edge), and a trailing odd card naturally stretches
 * to fill its own row instead of sitting alone at half width with a dangling empty gap next to it. */
function ProgressCardsGrid({ cards, captionFor, onPressCard }: { cards: ProgressCard[]; captionFor: (card: ProgressCard) => string; onPressCard: (card: ProgressCard) => void }) {
  const rows: ProgressCard[][] = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row[0].label} className="flex-row gap-3">
          {row.map((card) => (
            <ProgressCardTile key={card.label} card={card} caption={captionFor(card)} onPress={() => onPressCard(card)} />
          ))}
        </View>
      ))}
    </View>
  );
}

const PROGRESS_CARDS: ProgressCard[] = [
  { icon: "trophy", label: "My Ranks", caption: "Every tracked lift, gym & worldwide", route: "/(tabs)/ranks" },
  { icon: "trending-up", label: "Rank Over Time", caption: "Division timeline & rank-up history", route: "/profile/rank-history" },
  { icon: "ribbon", label: "Achievements", caption: "Your PR history", route: "/profile/achievements" },
  { icon: "calendar", label: "Training History", caption: "Calendar, streaks & charts", route: "/profile/history" },
  { icon: "scale", label: "Body Log", caption: "Weight & body fat over time", route: "/profile/body-log" },
  { icon: "list", label: "All Stats", caption: "Every number, one place", route: "/profile/all-stats" },
];

export default function ProfileScreen() {
  const { user } = useUser();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const xp = useProfileLevelStore((state) => state.xp);
  const division = useProfileLevelStore((state) => state.division);
  const crewName = useCrewStore((state) => state.name);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const records = usePersonalRecordsStore((state) => state.records);

  const stats = useMemo(() => realMemberStats(workouts), [workouts]);
  const xpToNextLevel = xpRequiredFor(division);
  const prCount = Object.keys(records).length;

  const displayName = onboarding.fullName?.trim() || user?.fullName || "Your Profile";
  const email = user?.primaryEmailAddress?.emailAddress;

  function goTo(path: SettingsRoute) {
    router.push(path);
  }

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const blob = await (await fetch(result.assets[0].uri)).blob();
      await user?.setProfileImage({ file: blob });
    } catch (error) {
      Alert.alert("Couldn't update photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="items-center gap-3 px-4 pt-6">
        <Pressable onPress={handleChangePhoto} disabled={uploadingPhoto} style={PRESSED_STYLE}>
          <View className="overflow-hidden rounded-full border-2 border-brand-yellow" style={{ width: 88, height: 88 }}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Image source={images.iconGorilla} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
            )}
          </View>
          <View
            className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-background bg-brand-yellow"
            style={{ width: 28, height: 28 }}
          >
            {uploadingPhoto ? <ActivityIndicator size="small" color={colors.brand.iron} /> : <Ionicons name="camera" size={14} color={colors.brand.iron} />}
          </View>
        </Pressable>
        <View className="items-center gap-0.5">
          <Text className="heading-4 text-text-primary">{displayName}</Text>
          {email && <Text className="body-sm text-text-secondary">{email}</Text>}
        </View>

        <Pressable
          onPress={() => goTo("/profile/edit")}
          style={PRESSED_STYLE}
          className="flex-row items-center gap-1.5 rounded-full border border-divider bg-surface px-4 py-2"
        >
          <Ionicons name="create-outline" size={14} color={colors.brand.yellow} />
          <Text className="body-sm font-body-semibold text-brand-yellow">Edit Profile</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)} className="mx-4 mt-6">
        <View className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface">
          <View style={{ width: 4, backgroundColor: DIVISION_COLOR[division] }} />
          <View className="flex-1 gap-2.5 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <DivisionBadge division={division} size={36} />
                <Text style={cardTitleStyle} className="text-text-primary">
                  {division.toUpperCase()}
                </Text>
              </View>
              <Text className="body-sm font-body-bold" style={{ color: DIVISION_COLOR[division] }}>
                {Math.min(100, Math.round((xp / xpToNextLevel) * 100))}%
              </Text>
            </View>

            <ProgressBar ratio={xp / xpToNextLevel} color={DIVISION_COLOR[division]} height={7} />

            <View className="flex-row items-center justify-between">
              <Text className="caption font-body-semibold text-text-secondary">
                {xp.toLocaleString("en-US")} / {xpToNextLevel.toLocaleString("en-US")} XP
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="flash" size={11} color={colors.brand.yellow} />
                <Text className="caption font-body-semibold text-brand-yellow">
                  {Math.max(0, xpToNextLevel - xp).toLocaleString("en-US")} XP to next
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="mx-4 mt-3 flex-row gap-3">
        <QuickStat icon="barbell" label="Workouts" value={String(stats.workoutsCount)} accent={colors.brand.yellow} />
        <QuickStat icon="ribbon" label="PRs" value={String(prCount)} accent={colors.semantic.success} />
        <QuickStat icon="trending-up" label="Volume" value={`${(stats.volumeKg / 1000).toFixed(1)}t`} accent={colors.semantic.info} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(160).springify().damping(16).mass(0.6)} className="mx-4 mt-6 gap-3">
        <Text style={sectionHeaderStyle} className="text-brand-white">
          MY PROGRESS
        </Text>
        <ProgressCardsGrid
          cards={PROGRESS_CARDS}
          captionFor={(card) => (card.label === "Achievements" ? `${prCount} PRs logged` : card.caption)}
          onPressCard={(card) => router.push(card.route)}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(220).springify().damping(16).mass(0.6)} className="mx-4 mt-6 gap-3">
        <Text style={sectionHeaderStyle} className="text-brand-white">
          SETTINGS
        </Text>
        <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
          <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => goTo("/profile/edit")} />
          <SettingsRow icon="swap-vertical-outline" label="Units" value={weightUnit === "kg" ? "Kilograms" : "Pounds"} onPress={() => goTo("/profile/units")} />
          <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => goTo("/profile/notifications")} />
          <SettingsRow icon="people-outline" label="My Crew" value={crewName} onPress={() => goTo("/crew/settings")} />
          <SettingsRow icon="card-outline" label="Subscription" onPress={() => goTo("/profile/subscription")} />
          <SettingsRow icon="settings-outline" label="Account" isLast onPress={() => goTo("/profile/account")} />
        </View>
      </Animated.View>
    </ScrollView>
  );
}
