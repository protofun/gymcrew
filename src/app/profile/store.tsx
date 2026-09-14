import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { FLEX_TAGS } from "@/data/flex-tags";
import { SPLIT_THEMES } from "@/data/split-themes";
import { toDateKey } from "@/lib/date";
import { divisionIndex } from "@/lib/division";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { STREAK_FREEZE_COST, XP_BOOST_COST, useCurrencyStore } from "@/store/currency-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useThemeStore } from "@/store/theme-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const heroValueStyle = { fontFamily: fontFamily.heading, fontSize: 40, lineHeight: 42 };

const EARN_SOURCES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "barbell", label: "Workout" },
  { icon: "ribbon", label: "PR" },
  { icon: "flag", label: "Challenge" },
  { icon: "trophy", label: "Battle win" },
];

function yesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateKey(yesterday);
}

function SectionHeader({ icon, title, count }: { icon: keyof typeof Ionicons.glyphMap; title: string; count?: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon} size={13} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          {title.toUpperCase()}
        </Text>
      </View>
      {count !== undefined && <Text className="caption font-body-semibold text-text-secondary">{count}</Text>}
    </View>
  );
}

function BoostCard({
  icon,
  iconColor,
  title,
  description,
  actionLabel,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  actionLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface">
      <View style={{ width: 4, backgroundColor: iconColor }} />
      <View className="flex-1 gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${iconColor}20` }}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="body-md font-body-bold text-text-primary">{title}</Text>
            <Text className="caption text-text-secondary">{description}</Text>
          </View>
        </View>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className={`items-center rounded-full py-3 ${disabled ? "bg-background" : "bg-brand-yellow"}`}
        >
          <Text className={`body-sm font-body-bold ${disabled ? "text-text-secondary" : "text-brand-iron"}`}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const tokens = useCurrencyStore((state) => state.tokens);
  const freezeDateKeys = useCurrencyStore((state) => state.freezeDateKeys);
  const spendStreakFreeze = useCurrencyStore((state) => state.useStreakFreeze);
  const xpBoostActive = useCurrencyStore((state) => state.xpBoostActive);
  const activateXpBoost = useCurrencyStore((state) => state.activateXpBoost);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const ownedTagIds = useCosmeticsStore((state) => state.ownedTagIds);
  const equippedTagId = useCosmeticsStore((state) => state.equippedTagId);
  const purchaseTag = useCosmeticsStore((state) => state.purchaseTag);
  const equipTag = useCosmeticsStore((state) => state.equipTag);
  const division = useProfileLevelStore((state) => state.division);
  const purchasedThemeKeys = useThemeStore((state) => state.purchasedThemeKeys);
  const purchaseTheme = useThemeStore((state) => state.purchaseTheme);

  const key = yesterdayKey();
  const trainedYesterday = workouts.some((workout) => toDateKey(new Date(workout.completedAt)) === key);
  const alreadyFrozen = freezeDateKeys.includes(key);
  const canFreeze = !trainedYesterday && !alreadyFrozen && tokens >= STREAK_FREEZE_COST;

  const unlockedDivisionIndex = divisionIndex(division);
  const lockedThemes = SPLIT_THEMES.filter(
    (theme) => divisionIndex(theme.unlockDivision) > unlockedDivisionIndex && !purchasedThemeKeys.includes(theme.key),
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Store</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 26 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.6)}
          className="flex-row items-stretch overflow-hidden rounded-3xl border border-divider bg-surface"
        >
          <View style={{ width: 4, backgroundColor: colors.brand.yellow }} />
          <View className="flex-1 gap-3 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-background">
                  <Ionicons name="diamond" size={22} color={colors.brand.yellow} />
                </View>
                <View>
                  <Text style={heroValueStyle} className="text-text-primary">
                    {tokens}
                  </Text>
                  <Text className="caption font-body-semibold text-text-secondary">TOKENS</Text>
                </View>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {EARN_SOURCES.map((source) => (
                <View key={source.label} className="flex-row items-center gap-1 rounded-full bg-background px-2.5 py-1">
                  <Ionicons name={source.icon} size={11} color={colors.neutral.textSecondary} />
                  <Text className="caption text-text-secondary">{source.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="gap-3">
          <SectionHeader icon="flash" title="Boosts" />
          <View className="gap-3">
            <BoostCard
              icon="snow"
              iconColor={colors.semantic.info}
              title="Streak Freeze"
              description="Protects your streak on a day you missed."
              actionLabel={
                alreadyFrozen
                  ? "Yesterday already protected"
                  : trainedYesterday
                    ? "Streak is safe — you trained yesterday"
                    : tokens < STREAK_FREEZE_COST
                      ? `Need ${STREAK_FREEZE_COST - tokens} more tokens`
                      : `Freeze Yesterday · ${STREAK_FREEZE_COST} tokens`
              }
              disabled={!canFreeze}
              onPress={() => {
                if (!canFreeze) return;
                spendStreakFreeze(key);
                posthog.capture("store_item_purchased", { item: "streak_freeze", cost: STREAK_FREEZE_COST });
              }}
            />
            <BoostCard
              icon="rocket"
              iconColor={colors.semantic.streak}
              title="2x XP Boost"
              description="Doubles the XP from your next completed workout."
              actionLabel={xpBoostActive ? "Active — finish a workout" : tokens < XP_BOOST_COST ? `Need ${XP_BOOST_COST - tokens} more tokens` : `Activate · ${XP_BOOST_COST} tokens`}
              disabled={xpBoostActive || tokens < XP_BOOST_COST}
              onPress={() => {
                activateXpBoost();
                posthog.capture("store_item_purchased", { item: "xp_boost", cost: XP_BOOST_COST });
              }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-3">
          <SectionHeader icon="color-palette" title="Themes" count={lockedThemes.length} />
          {lockedThemes.length === 0 ? (
            <View className="items-center gap-1.5 rounded-2xl border border-dashed border-divider px-6 py-6">
              <Ionicons name="checkmark-circle" size={20} color={colors.semantic.success} />
              <Text className="caption text-center text-text-secondary">Every Split Theme is unlocked.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {lockedThemes.map((theme) => (
                <View key={theme.key} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5">
                  <View className="h-9 w-9 rounded-full" style={{ backgroundColor: theme.color }} />
                  <View className="flex-1 gap-0.5">
                    <Text className="body-sm font-body-semibold text-text-primary">{theme.label}</Text>
                    <Text className="caption text-text-secondary">Normally unlocks at {theme.unlockDivision}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      purchaseTheme(theme.key, theme.earlyUnlockCost);
                      posthog.capture("store_item_purchased", { item: "split_theme", themeKey: theme.key, cost: theme.earlyUnlockCost });
                    }}
                    disabled={tokens < theme.earlyUnlockCost}
                    className={`flex-row items-center gap-1 rounded-full px-3.5 py-2 ${tokens >= theme.earlyUnlockCost ? "bg-brand-yellow" : "bg-background"}`}
                  >
                    <Ionicons name="diamond" size={11} color={tokens >= theme.earlyUnlockCost ? colors.brand.iron : colors.neutral.textSecondary} />
                    <Text className={`caption font-body-bold ${tokens >= theme.earlyUnlockCost ? "text-brand-iron" : "text-text-secondary"}`}>
                      {theme.earlyUnlockCost}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).springify().damping(16).mass(0.6)} className="gap-3">
          <SectionHeader icon="sparkles" title="Flex Tags" count={FLEX_TAGS.length} />
          <Text className="caption text-text-secondary">Purely cosmetic — shown next to your name on the crew roster and profile.</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {FLEX_TAGS.map((tag) => {
              const owned = ownedTagIds.includes(tag.id);
              const equipped = equippedTagId === tag.id;
              return (
                <View
                  key={tag.id}
                  style={{ width: "48%" }}
                  className={`items-center gap-2 rounded-2xl border p-4 ${
                    equipped ? "border-brand-yellow/40 bg-brand-yellow/5" : "border-divider bg-surface"
                  }`}
                >
                  <Text style={{ fontSize: 34 }}>{tag.emoji}</Text>
                  <Text className="body-sm font-body-bold text-text-primary">{tag.label}</Text>
                  {owned ? (
                    <Pressable
                      onPress={() => equipTag(equipped ? null : tag.id)}
                      className={`w-full items-center rounded-full py-2 ${equipped ? "bg-brand-yellow" : "border border-divider"}`}
                    >
                      <Text className={`caption font-body-bold ${equipped ? "text-brand-iron" : "text-text-secondary"}`}>
                        {equipped ? "Equipped" : "Equip"}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        purchaseTag(tag.id);
                        posthog.capture("store_item_purchased", { item: "flex_tag", tagId: tag.id, cost: tag.cost });
                      }}
                      disabled={tokens < tag.cost}
                      className={`w-full flex-row items-center justify-center gap-1 rounded-full py-2 ${
                        tokens >= tag.cost ? "bg-brand-yellow" : "bg-background"
                      }`}
                    >
                      <Ionicons name="diamond" size={11} color={tokens >= tag.cost ? colors.brand.iron : colors.neutral.textSecondary} />
                      <Text className={`caption font-body-bold ${tokens >= tag.cost ? "text-brand-iron" : "text-text-secondary"}`}>{tag.cost}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
