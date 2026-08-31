import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DivisionAvatarFrame } from "@/components/DivisionAvatarFrame";
import { StatTile } from "@/components/StatTile";
import { SPLIT_THEMES } from "@/data/split-themes";
import { DIVISION_COLOR, divisionIndex } from "@/lib/division";
import { computeCurrentStreak } from "@/lib/streak";
import { useCurrencyStore } from "@/store/currency-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const BATTLE_LEADER_MIN_DIVISION = "Silver";

function SectionHeader({ icon, title, iconColor }: { icon: keyof typeof Ionicons.glyphMap; title: string; iconColor?: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={icon} size={13} color={iconColor ?? colors.brand.yellow} />
      <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const division = useProfileLevelStore((state) => state.division);
  const tokens = useCurrencyStore((state) => state.tokens);
  const freezeDateKeys = useCurrencyStore((state) => state.freezeDateKeys);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const me = useCrewStore((state) => state.members.find((member) => member.id === CURRENT_MEMBER_ID));

  const currentStreak = computeCurrentStreak(workouts, new Date(), freezeDateKeys);

  const canIssueBattle = divisionIndex(division) >= divisionIndex(BATTLE_LEADER_MIN_DIVISION);
  const unlockedThemes = SPLIT_THEMES.filter((theme) => divisionIndex(theme.unlockDivision) <= divisionIndex(division));
  const nextTheme = SPLIT_THEMES.find((theme) => divisionIndex(theme.unlockDivision) > divisionIndex(division));

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Division Rewards</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-3">
          <StatTile id="profile.rewards.tokens" icon="diamond" value={String(tokens)} label="Tokens" />
          <StatTile id="profile.rewards.streak" icon="flame" value={String(currentStreak)} label="Day Streak" iconColor={colors.semantic.streak} />
        </View>

        <View className="gap-3">
          <SectionHeader icon="storefront" title="Currency · Store" />
          <Pressable
            onPress={() => router.push("/profile/store")}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
              <Ionicons name="diamond" size={18} color={colors.brand.yellow} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="body-sm font-body-semibold text-text-primary">Earned every workout, PR, and win</Text>
              <Text className="caption text-text-secondary">Spend on a Streak Freeze or Flex Tags.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        <View className="gap-3">
          <SectionHeader icon="person-circle" title="Cosmetic · Division Frame" />
          <View className="flex-row items-center gap-4 rounded-2xl border border-divider bg-surface p-4">
            {me && <DivisionAvatarFrame source={{ uri: me.avatarUrl }} division={division} size={64} />}
            <View className="flex-1 gap-1">
              <Text className="body-sm font-body-semibold text-text-primary" style={{ color: DIVISION_COLOR[division] }}>
                {division} Frame
              </Text>
              <Text className="caption text-text-secondary">Shown on your crew roster, leaderboard, and profile.</Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <SectionHeader icon="color-palette" title="Functional · Split Themes" />
          <Pressable
            onPress={() => router.push("/profile/workout-split")}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className="gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <View className="flex-row items-center gap-2.5">
              {SPLIT_THEMES.map((theme) => {
                const unlocked = divisionIndex(theme.unlockDivision) <= divisionIndex(division);
                return (
                  <View
                    key={theme.key}
                    className="items-center justify-center rounded-full"
                    style={{ width: 24, height: 24, backgroundColor: unlocked ? theme.color : colors.neutral.background }}
                  >
                    {!unlocked && <Ionicons name="lock-closed" size={10} color={colors.neutral.textSecondary} />}
                  </View>
                );
              })}
            </View>
            <Text className="caption text-text-secondary">
              {unlockedThemes.length} of {SPLIT_THEMES.length} Workout Split accent colors unlocked
              {nextTheme ? ` — next at ${nextTheme.unlockDivision}` : ""}.
            </Text>
          </Pressable>
        </View>

        <View className="gap-3">
          <SectionHeader icon="shield-checkmark" title="Prestige · Crew Battles" />
          <View className="gap-2 rounded-2xl border border-divider bg-surface p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={canIssueBattle ? "checkmark-circle" : "lock-closed"}
                size={16}
                color={canIssueBattle ? colors.semantic.success : colors.neutral.textSecondary}
              />
              <Text className="body-sm font-body-semibold text-text-primary">
                {canIssueBattle ? "You can challenge rival crews" : `Reach ${BATTLE_LEADER_MIN_DIVISION} (you're ${division})`}
              </Text>
            </View>
            <Text className="caption text-text-secondary">
              Only {BATTLE_LEADER_MIN_DIVISION}+ members can start a crew Battle — a real head-to-head against a rival crew.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
