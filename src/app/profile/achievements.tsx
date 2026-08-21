import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementRow } from "@/components/AchievementRow";
import { realMemberAchievements } from "@/lib/member-real-profile";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors } from "@/theme";

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const records = usePersonalRecordsStore((state) => state.records);
  const achievements = useMemo(() => realMemberAchievements(records, 100), [records]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Achievements</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {achievements.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="trophy-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No PRs logged yet.</Text>
            <Text className="body-sm text-text-secondary">Log a set to start building your history.</Text>
          </View>
        ) : (
          achievements.map((achievement) => <AchievementRow key={achievement.id} achievement={achievement} />)
        )}
      </ScrollView>
    </View>
  );
}
