import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { GoalRing } from "@/components/GoalRing";
import type { WorkoutSession } from "@/data/workout-log";
import { useCountUp } from "@/hooks/use-count-up";
import { getGoalProgress } from "@/lib/goal-progress";
import { useGoalsStore, type Goal, type TrackingMode } from "@/store/goals-store";
import { colors, fontFamily } from "@/theme";

function ModeButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : "bg-background"} ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Text className={`body-sm font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

type GoalDetailModalProps = {
  visible: boolean;
  goal: Goal | null;
  sessions: Record<string, WorkoutSession>;
  onClose: () => void;
};

export function GoalDetailModal({ visible, goal, sessions, onClose }: GoalDetailModalProps) {
  const updateGoal = useGoalsStore((state) => state.updateGoal);
  const removeGoal = useGoalsStore((state) => state.removeGoal);

  const [trackingMode, setTrackingMode] = useState<TrackingMode>("auto");
  const [targetDraft, setTargetDraft] = useState("");
  const [currentDraft, setCurrentDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setTrackingMode(goal.trackingMode);
    setTargetDraft(String(goal.targetValue));
    setCurrentDraft(String(goal.manualCurrentValue));
    setConfirmingDelete(false);
  }, [goal]);

  const liveGoal: Goal | null = goal
    ? {
        ...goal,
        trackingMode,
        targetValue: parseFloat(targetDraft) || goal.targetValue,
        manualCurrentValue: parseFloat(currentDraft) || goal.manualCurrentValue,
      }
    : null;

  const { currentValue, ratio } = liveGoal ? getGoalProgress(liveGoal, sessions) : { currentValue: 0, ratio: 0 };
  const animatedPercent = useCountUp(Math.round(ratio * 100));

  if (!goal || !liveGoal) return null;

  const canAutoTrack = goal.metric !== "weight" && goal.metric !== "custom";

  const handleSave = () => {
    updateGoal(goal.id, {
      trackingMode,
      targetValue: liveGoal.targetValue,
      manualCurrentValue: liveGoal.manualCurrentValue,
    });
    onClose();
  };

  const handleDeletePress = () => {
    if (confirmingDelete) {
      removeGoal(goal.id);
      onClose();
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="flex-row items-center gap-3 pr-6">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
              <Ionicons name={goal.icon as keyof typeof Ionicons.glyphMap} size={20} color={goal.color} />
            </View>
            <Text className="heading-4 text-text-primary">{goal.label}</Text>
          </View>

          <View className="items-center gap-3 rounded-2xl bg-background p-4">
            <GoalRing ratio={ratio} color={goal.color} size={140} strokeWidth={9}>
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 36, lineHeight: 36, color: goal.color }}>
                {animatedPercent}%
              </Text>
            </GoalRing>
            <Text className="caption text-text-secondary">
              {Math.round(currentValue).toLocaleString("en-US")} / {liveGoal.targetValue.toLocaleString("en-US")}{" "}
              {goal.unit}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="body-md font-body-semibold text-text-primary">Tracking Method</Text>
            <View className="flex-row gap-2">
              <ModeButton
                label="Automatic"
                active={trackingMode === "auto"}
                disabled={!canAutoTrack}
                onPress={() => setTrackingMode("auto")}
              />
              <ModeButton label="Manual" active={trackingMode === "manual"} onPress={() => setTrackingMode("manual")} />
            </View>
            {!canAutoTrack ? (
              <Text className="caption text-text-secondary">
                {goal.metric === "weight"
                  ? "No weight log yet, so this goal can only be tracked manually."
                  : "Custom goals can only be tracked manually."}
              </Text>
            ) : trackingMode === "auto" ? (
              <Text className="caption text-text-secondary">Calculated from this month&apos;s logged workouts.</Text>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            {trackingMode === "manual" && (
              <View className="flex-1 gap-1">
                <Text className="caption text-text-secondary">Current ({goal.unit})</Text>
                <TextInput
                  value={currentDraft}
                  onChangeText={setCurrentDraft}
                  keyboardType="numeric"
                  className="body-md rounded-xl bg-background p-3 text-text-primary"
                />
              </View>
            )}
            <View className="flex-1 gap-1">
              <Text className="caption text-text-secondary">Target ({goal.unit})</Text>
              <TextInput
                value={targetDraft}
                onChangeText={setTargetDraft}
                keyboardType="numeric"
                className="body-md rounded-xl bg-background p-3 text-text-primary"
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleDeletePress}
              className={`items-center justify-center rounded-full px-4 py-3 ${
                confirmingDelete ? "bg-error" : "bg-background"
              }`}
            >
              <Ionicons
                name={confirmingDelete ? "trash" : "trash-outline"}
                size={18}
                color={confirmingDelete ? colors.brand.white : colors.neutral.textSecondary}
              />
            </Pressable>
            <Pressable onPress={handleSave} className="flex-1 items-center rounded-full bg-brand-yellow py-3">
              <Text className="body-md font-body-bold text-brand-iron">Save Goal</Text>
            </Pressable>
          </View>
          {confirmingDelete && (
            <Text className="caption text-center text-error">Tap the trash icon again to permanently delete.</Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
