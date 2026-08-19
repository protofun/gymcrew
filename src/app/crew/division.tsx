import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DivisionBadge } from "@/components/DivisionBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { DIVISION_COLOR, nextDivision, xpRequiredFor } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { colors } from "@/theme";

const REWARDS = [
  { key: "xp-boost", label: "+10% Crew XP Boost", unlocked: true },
  { key: "badge", label: "Division Badge", unlocked: true },
  { key: "border", label: "Exclusive Crew Border", unlocked: false },
] as const;

export default function DivisionInfoScreen() {
  const insets = useSafeAreaInsets();
  const division = useCrewStore((state) => state.division);
  const divisionTopPercentile = useCrewStore((state) => state.divisionTopPercentile);
  const xp = useCrewStore((state) => state.xp);
  const xpNeeded = xpRequiredFor(division);
  const next = nextDivision(division);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Division Info</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3">
          <DivisionBadge division={division} size={140} />
          <Text className="heading-2 text-text-primary">{division}</Text>
          <Text className="body-md text-center text-text-secondary">
            You are in the top {divisionTopPercentile}% of crews{"\n"}in your division.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="caption text-text-secondary">DIVISION PROGRESS</Text>
          <ProgressBar ratio={next ? xp / xpNeeded : 1} color={colors.brand.yellow} height={8} />
          <Text className="caption text-right text-text-secondary">
            {next ? `${xp.toLocaleString("en-US")} / ${xpNeeded.toLocaleString("en-US")} XP` : "Top division reached"}
          </Text>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface p-4">
          <Text className="caption text-text-secondary">NEXT DIVISION</Text>
          {next ? (
            <View className="flex-row items-center gap-2">
              <Text className="body-lg font-body-semibold" style={{ color: DIVISION_COLOR[next] }}>
                {next}
              </Text>
              <DivisionBadge division={next} size={24} />
            </View>
          ) : (
            <Text className="body-lg font-body-semibold text-brand-yellow">You&apos;ve reached the top</Text>
          )}
        </View>

        <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
          <Text className="caption text-text-secondary">DIVISION REWARDS</Text>
          {REWARDS.map((reward) => (
            <View key={reward.key} className="flex-row items-center justify-between">
              <Text className="body-md text-text-primary">{reward.label}</Text>
              <Ionicons
                name={reward.unlocked ? "checkmark-circle" : "lock-closed"}
                size={18}
                color={reward.unlocked ? colors.semantic.success : colors.neutral.textSecondary}
              />
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/crew/all-divisions")}
          className="items-center rounded-full border border-divider py-4"
        >
          <Text className="body-md font-body-semibold text-text-primary">VIEW ALL DIVISIONS</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
