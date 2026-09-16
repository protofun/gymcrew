import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AttachStep } from "react-native-spotlight-tour";

import { ATTACH_INDEXES } from "@/components/AppTourOverlay";
import { AvatarActionSheet } from "@/components/AvatarActionSheet";
import { AvatarGeneratorModal } from "@/components/AvatarGeneratorModal";
import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { ProgressBar } from "@/components/ProgressBar";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { TodayWorkoutModal } from "@/components/TodayWorkoutModal";
import { images, navIcons } from "@/constants/images";
import { FLEX_TAGS } from "@/data/flex-tags";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { applyProfileImage } from "@/lib/avatar";
import { DIVISION_COLOR, xpRequiredFor } from "@/lib/division";
import { realMemberStats } from "@/lib/member-real-profile";
import { computeProfileSnapshot } from "@/lib/profile-snapshot";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
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

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.75 : 1,
});

type SettingsRoute = "/profile/edit" | "/profile/units" | "/profile/notifications" | "/profile/subscription" | "/profile/account" | "/profile/achievements" | "/profile/history" | "/profile/body-log" | "/profile/rank-history" | "/profile/all-stats" | "/profile/workout-split" | "/profile/rewards" | "/profile/support" | "/profile/roadmap" | "/profile/changelog" | "/crew/settings" | "/workout-split/intro";

type ProgressCard = {
  icon: ImageSourcePropType;
  label: string;
  caption: string;
  route: SettingsRoute | "/(tabs)/ranks" | "/nutrition" | "/progress-photos/compare";
};

function SettingsRow({ icon, label, value, danger, isLast, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; danger?: boolean; isLast?: boolean; onPress: () => void }) {
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

/** A stat readout inline within the profile hero card — deliberately not `StatTile` (the shared
 * grid-tile look used elsewhere, e.g. Crew Stats), since a bordered box per number would read as
 * three more disconnected pieces exactly where the goal is one unified card. */
function HeroStatColumn({ icon, value, label, id }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; id: string }) {
  return (
    <View className="flex-1 items-center gap-1.5">
      <Ionicons name={icon} size={15} color={colors.brand.yellow} />
      <EditableText id={id} style={{ fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 22 }} className="text-text-primary">
        {value}
      </EditableText>
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

function ProgressCardTile({ card, caption, onPress }: { card: ProgressCard; caption: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={PRESSED_STYLE} className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-4">
      <Image source={card.icon} resizeMode="contain" style={{ width: 30, height: 30 }} />
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
  { icon: navIcons.rank, label: "My Ranks", caption: "Every tracked lift, gym & worldwide", route: "/(tabs)/ranks" },
  { icon: navIcons.rankOverTime, label: "Rank Over Time", caption: "Division timeline & rank-up history", route: "/profile/rank-history" },
  { icon: navIcons.achievements, label: "Personal Records", caption: "Every PR, newest first", route: "/profile/achievements" },
  { icon: navIcons.trainingHistory, label: "Training History", caption: "Calendar, streaks & charts", route: "/profile/history" },
  { icon: navIcons.nutrition, label: "Nutrition", caption: "Calories, macros & food log", route: "/nutrition" },
  { icon: navIcons.bodyLog, label: "Body Log", caption: "Weight & body fat over time", route: "/profile/body-log" },
  { icon: navIcons.progress, label: "Progress Photos", caption: "See your physique change over time", route: "/progress-photos/compare" },
  { icon: navIcons.allStats, label: "All Stats", caption: "Every number, one place", route: "/profile/all-stats" },
];

export default function ProfileScreen() {
  const { user } = useUser();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const [avatarGeneratorOpen, setAvatarGeneratorOpen] = useState(false);

  const today = useTodayWorkout();
  const setTodayOverride = useTodayTrainingStore((state) => state.setTodayOverride);
  const clearTodayOverride = useTodayTrainingStore((state) => state.clearTodayOverride);

  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const xp = useProfileLevelStore((state) => state.xp);
  const division = useProfileLevelStore((state) => state.division);
  const divisionHistory = useProfileLevelStore((state) => state.divisionHistory);
  const crewName = useCrewStore((state) => state.name);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const records = usePersonalRecordsStore((state) => state.records);
  const equippedTagId = useCosmeticsStore((state) => state.equippedTagId);
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);

  const stats = useMemo(() => realMemberStats(workouts), [workouts]);
  const xpToNextLevel = xpRequiredFor(division);
  const prCount = Object.keys(records).length;

  const snapshot = useMemo(
    () => (snapshotAsOfMs != null ? computeProfileSnapshot(snapshotAsOfMs, workouts, divisionHistory) : null),
    [snapshotAsOfMs, workouts, divisionHistory],
  );
  const displayDivision = snapshot?.division ?? division;
  const displayWorkoutsCount = snapshot?.workoutsCount ?? stats.workoutsCount;
  const displayPrCount = snapshot?.prCount ?? prCount;
  const displayVolumeKg = snapshot?.volumeKg ?? stats.volumeKg;

  const displayName = onboarding.fullName?.trim() || user?.fullName || "Your Profile";
  const email = user?.primaryEmailAddress?.emailAddress;
  const equippedTag = FLEX_TAGS.find((tag) => tag.id === equippedTagId);

  function goTo(path: SettingsRoute) {
    router.push(path);
  }

  function handlePressAvatar() {
    setAvatarActionsOpen(true);
  }

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0] || !user) return;

    setUploadingPhoto(true);
    try {
      const blob = await (await fetch(result.assets[0].uri)).blob();
      await applyProfileImage(user, blob);
    } catch (error) {
      Alert.alert("Couldn't update photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}
      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="mx-4 mt-4 overflow-hidden rounded-3xl border border-divider bg-surface">
            {/* Ties the whole card to the division color it's reporting on, the same way the old
            left-accent-bar sub-card did — just spanning the header this whole card shares now,
            instead of being scoped to one piece of it. */}
            <View
              style={{
                height: 4,
                backgroundColor: DIVISION_COLOR[displayDivision],
              }}
            />

            <View className="items-center gap-3 px-5 pb-5 pt-5">
              <Pressable onPress={handlePressAvatar} disabled={uploadingPhoto} style={PRESSED_STYLE}>
                <DivisionAvatarFrame source={user?.imageUrl ? { uri: user.imageUrl } : images.iconGorilla} division={displayDivision} size={88} />
                <View className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-background bg-brand-yellow" style={{ width: 28, height: 28 }}>
                  {uploadingPhoto ? <ActivityIndicator size="small" color={colors.brand.iron} /> : <Ionicons name="camera" size={14} color={colors.brand.iron} />}
                </View>
              </Pressable>

              <View className="items-center gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <EditableText id="profile.header.name" className="heading-3 text-text-primary">
                    {displayName}
                  </EditableText>
                  {equippedTag && <Text style={{ fontSize: 18 }}>{equippedTag.emoji}</Text>}
                </View>
                {email && <Text className="body-sm text-text-secondary">{email}</Text>}
              </View>

              <View className="flex-row flex-wrap items-center justify-center gap-2">
                <Pressable onPress={() => setTodayModalOpen(true)} style={PRESSED_STYLE} className="flex-row items-center gap-1.5 rounded-full bg-background px-4 py-2">
                  <Ionicons name={today.isRestDay ? "moon-outline" : "barbell-outline"} size={14} color={today.isOverridden ? colors.brand.yellow : colors.neutral.textSecondary} />
                  <Text className={`body-sm font-body-semibold ${today.isOverridden ? "text-brand-yellow" : "text-text-primary"}`}>{today.workoutName}</Text>
                </Pressable>

                <Pressable onPress={() => goTo("/profile/edit")} style={PRESSED_STYLE} className="flex-row items-center gap-1.5 rounded-full bg-background px-4 py-2">
                  <Ionicons name="create-outline" size={14} color={colors.brand.yellow} />
                  <Text className="body-sm font-body-semibold text-brand-yellow">Edit Profile</Text>
                </Pressable>
              </View>
            </View>

            <View className="h-px bg-divider" />

            <View className="gap-2.5 px-5 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <DivisionBadge division={displayDivision} size={32} />
                  <EditableText id="profile.division.name" style={cardTitleStyle} className="text-text-primary">
                    {displayDivision.toUpperCase()}
                  </EditableText>
                </View>
                {snapshot == null && (
                  <EditableText id="profile.division.percent" className="body-sm font-body-bold" style={{ color: DIVISION_COLOR[displayDivision] }}>
                    {`${Math.min(100, Math.round((xp / xpToNextLevel) * 100))}%`}
                  </EditableText>
                )}
              </View>

              {snapshot == null ? (
                <>
                  <ProgressBar ratio={xp / xpToNextLevel} color={DIVISION_COLOR[displayDivision]} height={7} />

                  <View className="flex-row items-center justify-between">
                    <EditableText id="profile.division.xpProgress" className="caption font-body-semibold text-text-secondary">
                      {`${xp.toLocaleString("en-US")} / ${xpToNextLevel.toLocaleString("en-US")} XP`}
                    </EditableText>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="flash" size={11} color={colors.brand.yellow} />
                      <EditableText id="profile.division.xpToNext" className="caption font-body-semibold text-brand-yellow">
                        {`${Math.max(0, xpToNextLevel - xp).toLocaleString("en-US")} XP to next`}
                      </EditableText>
                    </View>
                  </View>
                </>
              ) : (
                <Text className="caption font-body-semibold text-text-secondary">Division reached as of this date</Text>
              )}
            </View>

            <View className="h-px bg-divider" />

            <AttachStep index={ATTACH_INDEXES.profile} fill>
              <View className="flex-row items-stretch px-5 py-4">
                <HeroStatColumn id="profile.stats.workouts" icon="barbell" label="Workouts" value={String(displayWorkoutsCount)} />
                <View className="w-px bg-divider" />
                <HeroStatColumn id="profile.stats.prs" icon="ribbon" label="PRs" value={String(displayPrCount)} />
                <View className="w-px bg-divider" />
                <HeroStatColumn id="profile.stats.volume" icon="trending-up" label="Volume" value={`${(displayVolumeKg / 1000).toFixed(1)}t`} />
              </View>
            </AttachStep>
          </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).springify().damping(16).mass(0.6)} className="mx-4 mt-6 gap-3">
          <Text style={sectionHeaderStyle} className="text-brand-white">
            MY PROGRESS
          </Text>
          <ProgressCardsGrid cards={PROGRESS_CARDS} captionFor={(card) => (card.label === "Personal Records" ? `${displayPrCount} PRs logged` : card.caption)} onPressCard={(card) => router.push(card.route)} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).springify().damping(16).mass(0.6)} className="mx-4 mt-6 gap-3">
          <Text style={sectionHeaderStyle} className="text-brand-white">
            SETTINGS
          </Text>
          <View className="overflow-hidden rounded-2xl border border-divider bg-surface">
            <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => goTo("/profile/edit")} />
            <SettingsRow icon="calendar-outline" label="Workout Split" onPress={() => goTo("/workout-split/intro")} />
            <SettingsRow icon="swap-vertical-outline" label="Units" value={weightUnit === "kg" ? "Kilograms" : "Pounds"} onPress={() => goTo("/profile/units")} />
            <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => goTo("/profile/notifications")} />
            <SettingsRow icon="people-outline" label="My Crew" value={crewName} onPress={() => goTo("/crew/settings")} />
            <SettingsRow icon="card-outline" label="Subscription" onPress={() => goTo("/profile/subscription")} />
            <SettingsRow icon="help-buoy-outline" label="Contact & Support" onPress={() => goTo("/profile/support")} />
            <SettingsRow icon="sparkles-outline" label="Changelog" onPress={() => goTo("/profile/changelog")} />
            <SettingsRow icon="map-outline" label="What's Coming" onPress={() => goTo("/profile/roadmap")} />
            <SettingsRow icon="settings-outline" label="Account" isLast onPress={() => goTo("/profile/account")} />
          </View>
        </Animated.View>
      </ScrollView>

      <TodayWorkoutModal
        visible={todayModalOpen}
        onClose={() => setTodayModalOpen(false)}
        isOverridden={today.isOverridden}
        onSave={(name) => setTodayOverride(name)}
        onClearOverride={clearTodayOverride}
      />

      <AvatarActionSheet
        visible={avatarActionsOpen}
        onClose={() => setAvatarActionsOpen(false)}
        onChoosePhoto={() => {
          setAvatarActionsOpen(false);
          handleChangePhoto();
        }}
        onGenerateAvatar={() => {
          setAvatarActionsOpen(false);
          setAvatarGeneratorOpen(true);
        }}
      />

      <AvatarGeneratorModal visible={avatarGeneratorOpen} onClose={() => setAvatarGeneratorOpen(false)} />
    </View>
  );
}
