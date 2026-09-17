import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AddGoalModal } from "@/components/AddGoalModal";
import { EditableText } from "@/components/EditableText";
import { GoalDetailModal } from "@/components/GoalDetailModal";
import { GoalRing } from "@/components/GoalRing";
import { StaggeredText } from "@/components/ui/organisms/animated-text";
import { images } from "@/constants/images";
import type { WorkoutSession } from "@/data/workout-log";
import { getGoalProgress } from "@/lib/goal-progress";
import { useGoalsStore, type Goal } from "@/store/goals-store";
import { colors, fontFamily } from "@/theme";

const RING_SIZE = 44;
const BADGE_SIZE = 34;

const HEADLINE_STYLE = {
  fontFamily: fontFamily.heading,
  fontSize: 40,
  lineHeight: 40 * 1.2,
  fontWeight: "700" as const,
  color: colors.brand.white,
};

// StaggeredText's default blur-reveal doesn't render correctly on web (expo-blur's animated
// intensity misbehaves there) — disabled, keeping only the fade/slide/scale reveal.
const NO_BLUR = { maxBlurIntensity: 0 };

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

      <EditableText id={`home.goals.${goal.id}.label`} className="body-md font-body-semibold flex-1 text-text-primary" numberOfLines={1}>
        {goal.label}
      </EditableText>

      <EditableText id={`home.goals.${goal.id}.percent`} className="body-lg font-body-semibold" style={{ color: goal.color }}>
        {`${percent}%`}
      </EditableText>
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
          <EditableText id="home.goals.tagline" className="body-lg text-text-secondary">
            Track your progress
          </EditableText>
          <View className="mt-1">
            <StaggeredText text="YOUR GOALS" style={HEADLINE_STYLE} animationConfig={NO_BLUR} />
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <EditableText id="home.goals.activeCount" className="caption text-text-secondary">
          {`${goals.length} active goals`}
        </EditableText>
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
