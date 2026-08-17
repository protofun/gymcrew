import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { AddGoalModal } from "@/components/AddGoalModal";
import { GoalDetailModal } from "@/components/GoalDetailModal";
import { GoalRing } from "@/components/GoalRing";
import { images } from "@/constants/images";
import type { WorkoutSession } from "@/data/workout-log";
import { getGoalProgress } from "@/lib/goal-progress";
import { useGoalsStore, type Goal } from "@/store/goals-store";
import { colors } from "@/theme";

const RING_SIZE = 44;
const BADGE_SIZE = 34;

function GoalRow({ goal, sessions, onPress }: { goal: Goal; sessions: Record<string, WorkoutSession>; onPress: () => void }) {
  const { ratio } = getGoalProgress(goal, sessions);
  const percent = Math.round(ratio * 100);

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3">
      <GoalRing ratio={ratio} color={goal.color} size={RING_SIZE} strokeWidth={3}>
        <View
          className="items-center justify-center rounded-full bg-surface"
          style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
        >
          <Ionicons name={goal.icon as keyof typeof Ionicons.glyphMap} size={16} color={goal.color} />
        </View>
      </GoalRing>

      <Text className="body-md font-body-semibold flex-1 text-text-primary" numberOfLines={1}>
        {goal.label}
      </Text>

      <Text className="body-lg font-body-semibold" style={{ color: goal.color }}>
        {percent}%
      </Text>
    </Pressable>
  );
}

type GoalsWidgetProps = {
  sessions: Record<string, WorkoutSession>;
};

export function GoalsWidget({ sessions }: GoalsWidgetProps) {
  const goals = useGoalsStore((state) => state.goals);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;

  return (
    <View className="mx-4 mt-8">
      <View className="relative">
        <Image
          source={images.mascotFlexing}
          resizeMode="contain"
          style={{ position: "absolute", top: -14, right: -12, width: 170, height: 140 }}
        />

        <View className="pr-24">
          <Text className="body-lg text-text-secondary">Track your progress</Text>
          <Text className="heading-2 mt-1 text-brand-white">YOUR GOALS</Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <Text className="caption text-text-secondary">{goals.length} active goals</Text>
        <Pressable
          onPress={() => setAddModalVisible(true)}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-full bg-brand-yellow"
        >
          <Ionicons name="add" size={18} color={colors.brand.iron} />
        </Pressable>
      </View>

      <View className="mt-3 gap-4">
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} sessions={sessions} onPress={() => setSelectedGoalId(goal.id)} />
        ))}
      </View>

      <GoalDetailModal
        visible={selectedGoal !== null}
        goal={selectedGoal}
        sessions={sessions}
        onClose={() => setSelectedGoalId(null)}
      />

      <AddGoalModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} />
    </View>
  );
}
