import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInUp, useSharedValue, withTiming } from "react-native-reanimated";

import { GoalSheet } from "@/components/GoalSheet";
import { GoalTargetRuler } from "@/components/GoalTargetRuler";
import { FieldLabel } from "@/components/OnboardingScreen";
import { SegmentedField } from "@/components/SegmentedField";
import { SectionHeading } from "@/components/SectionHeading";
import { SaveButton } from "@/components/ui/micro-interactions/save-button";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { AI_SAVE_BUTTON_COLORS } from "@/constants/ai-scan-theme";
import { goalKind, targetSpec } from "@/data/goal-kinds";
import type { WorkoutSession } from "@/data/workout-log";
import { useGoalProgress } from "@/hooks/use-goal-progress";
import { useGoalsStore, type Goal, type TrackingMode } from "@/store/goals-store";
import { colors, fontFamily } from "@/theme";

type GoalDetailModalProps = {
  visible: boolean;
  goal: Goal | null;
  sessions: Record<string, WorkoutSession>;
  onClose: () => void;
};

const TRACKING_OPTIONS = [
  { key: "auto", label: "Automatic" },
  { key: "manual", label: "Manual" },
] as const;

// Stands in while no goal is open, so the hooks below always run.
const NO_GOAL: Goal = { id: "", label: "", icon: "flag", color: colors.brand.yellow, metric: "custom", direction: "increase", trackingMode: "manual", startValue: 0, targetValue: 1, manualCurrentValue: 0, unit: "" };

/** A goal, opened: how far along it is as a big ring with the percentage rolling, whether the app works it out (automatic) or you do
 * (manual), and the target — and, when manual, where you are now — each set by dragging a ruler with the number right above it. The
 * numbers move as you change them, so you see what a new target does to the ring before you save. */
export function GoalDetailModal({ visible, goal, sessions, onClose }: GoalDetailModalProps) {
  const updateGoal = useGoalsStore((state) => state.updateGoal);
  const removeGoal = useGoalsStore((state) => state.removeGoal);

  const [trackingMode, setTrackingMode] = useState<TrackingMode>("auto");
  const [target, setTarget] = useState(1);
  const [current, setCurrent] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [rulerKey, setRulerKey] = useState(0);

  useEffect(() => {
    if (!goal) return;
    setTrackingMode(goal.trackingMode);
    setTarget(goal.targetValue);
    setCurrent(goal.manualCurrentValue);
    setConfirmingDelete(false);
    setRulerKey((key) => key + 1);
  }, [goal]);

  const base = goal ?? NO_GOAL;
  const liveGoal: Goal = { ...base, trackingMode, targetValue: target, manualCurrentValue: current };
  const { currentValue, ratio } = useGoalProgress(liveGoal, sessions);
  const percent = Math.round(ratio * 100);
  const ringProgress = useSharedValue(0);

  useEffect(() => {
    ringProgress.value = withTiming(Math.min(percent, 100), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [percent, ringProgress]);

  if (!goal) return null;

  const kind = goalKind(goal.metric);
  const canAutoTrack = goal.metric !== "custom";
  const spec = targetSpec(goal.metric, goal.unit, Math.max(target, goal.targetValue));

  function handleSave() {
    updateGoal(goal!.id, { trackingMode, targetValue: target, manualCurrentValue: current });
  }

  function handleDeletePress() {
    if (confirmingDelete) {
      removeGoal(goal!.id);
      onClose();
    } else {
      setConfirmingDelete(true);
    }
  }

  return (
    <GoalSheet visible={visible} onClose={onClose}>
      <SectionHeading id={`goal.${goal.id}.headline`} title={goal.label} eyebrow={kind.auto && trackingMode === "auto" ? "Calculated automatically" : "Updated by you"} />

      <Animated.View entering={FadeInUp.duration(350)} className="items-center gap-3">
        <CircularProgress
          progress={ringProgress}
          size={168}
          strokeWidth={12}
          gap={0}
          outerCircleColor={colors.neutral.divider}
          progressCircleColor={goal.color}
          backgroundColor="transparent"
          renderIcon={() => (
            <View className="items-center">
              <Ionicons name={goal.icon as keyof typeof Ionicons.glyphMap} size={22} color={goal.color} />
              <View className="flex-row items-baseline">
                <NumberFlow value={percent} fontSize={40} color={colors.brand.white} fontWeight="800" />
                <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.neutral.textSecondary }}>%</Text>
              </View>
            </View>
          )}
        />
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 1, color: colors.brand.white }}>
          {`${Math.round(currentValue * 10) / 10}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} <Text style={{ color: colors.neutral.textSecondary }}>{`/ ${target.toLocaleString("en-US")} ${goal.unit}`.toUpperCase()}</Text>
        </Text>
      </Animated.View>

      <View className="gap-2">
        <FieldLabel>Tracking method</FieldLabel>
        <SegmentedField options={TRACKING_OPTIONS} value={trackingMode} onChange={(mode) => (mode === "auto" && !canAutoTrack ? undefined : setTrackingMode(mode))} paddingVertical={11} />
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.neutral.textSecondary }}>
          {!canAutoTrack ? "Your own goals can only be tracked manually." : trackingMode === "auto" ? kind.hint : "You set where you are — the app won't change it."}
        </Text>
      </View>

      <GoalTargetRuler
        label="Target"
        value={target}
        unit={goal.unit}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        color={goal.color}
        onChange={setTarget}
        resetKey={rulerKey}
      />

      {trackingMode === "manual" && (
        <GoalTargetRuler
          label="Where you are now"
          value={current}
          unit={goal.unit}
          min={goal.metric === "weight" ? spec.min : 0}
          max={spec.max}
          step={spec.step}
          color={colors.brand.white}
          onChange={setCurrent}
          resetKey={rulerKey}
        />
      )}

      <View className="items-center gap-4">
        <SaveButton.Root onSave={handleSave} onSaved={onClose} colors={AI_SAVE_BUTTON_COLORS} minLoading={300} successPause={250}>
          <SaveButton.Label style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Save goal</SaveButton.Label>
          <SaveButton.Saved style={{ fontFamily: fontFamily.bodyBold, fontSize: 15 }}>Saved</SaveButton.Saved>
        </SaveButton.Root>

        <Pressable onPress={handleDeletePress} hitSlop={8} className="flex-row items-center gap-1.5">
          <Ionicons name={confirmingDelete ? "trash" : "trash-outline"} size={16} color={colors.semantic.error} />
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 1, color: colors.semantic.error }}>{confirmingDelete ? "TAP AGAIN TO DELETE FOR GOOD" : "DELETE GOAL"}</Text>
        </Pressable>
      </View>
    </GoalSheet>
  );
}
