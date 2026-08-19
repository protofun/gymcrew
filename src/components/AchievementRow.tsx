import { Image, Text, View } from "react-native";

import { images } from "@/constants/images";
import type { Achievement } from "@/lib/member-mock-profile";
import { formatShortAgo } from "@/lib/time-since";

export function AchievementRow({ achievement }: { achievement: Achievement }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
        <Image source={images.rankGold} resizeMode="contain" style={{ width: 28, height: 28 }} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary">{achievement.exerciseName} PR</Text>
        <Text className="caption text-text-secondary">
          {achievement.weightKg} kg × {achievement.reps} reps
        </Text>
      </View>

      <Text className="caption text-text-secondary">{formatShortAgo(achievement.achievedAt)}</Text>
    </View>
  );
}
