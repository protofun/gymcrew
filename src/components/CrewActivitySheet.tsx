import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LedWorkoutSession } from "@/store/led-workout-store";
import { colors } from "@/theme";

type CrewActivitySheetProps = {
  visible: boolean;
  onClose: () => void;
  session: LedWorkoutSession | null;
  iAmLeader: boolean;
  iHaveJoined: boolean;
  hasWorkoutInProgress: boolean;
  onContinueWorkout: () => void;
  onJoinWorkout: () => void;
  onLeadWorkout: () => void;
  onSoloWorkout: () => void;
  onSetTodaysTraining: () => void;
};

function ActionRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
        <Ionicons name={icon} size={18} color={colors.brand.yellow} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="body-lg text-text-primary">{label}</Text>
        {detail && <Text className="caption text-text-secondary">{detail}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
    </Pressable>
  );
}

export function CrewActivitySheet({
  visible,
  onClose,
  session,
  iAmLeader,
  iHaveJoined,
  hasWorkoutInProgress,
  onContinueWorkout,
  onJoinWorkout,
  onLeadWorkout,
  onSoloWorkout,
  onSetTodaysTraining,
}: CrewActivitySheetProps) {
  const insets = useSafeAreaInsets();
  const canContinue = hasWorkoutInProgress && (iAmLeader || iHaveJoined);
  const canJoin = session !== null && !iAmLeader && !iHaveJoined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18).mass(0.7)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}
        >
          <Pressable onPress={() => {}} className="gap-1 rounded-t-3xl border border-divider bg-surface px-5 pb-2 pt-4">
            <Text className="body-sm mb-2 text-text-secondary">Crew Activities</Text>

            {canContinue && (
              <>
                <ActionRow
                  icon="play-circle"
                  label={iAmLeader ? "Continue Leading" : `Continue ${session?.leaderName}'s Workout`}
                  detail={session?.workoutName}
                  onPress={onContinueWorkout}
                />
                <View className="h-px bg-divider" />
              </>
            )}

            {canJoin && (
              <>
                <ActionRow
                  icon="people"
                  label={`Join ${session?.leaderName}'s Workout`}
                  detail={`${session?.workoutName} · ${session?.participantIds.length} training`}
                  onPress={onJoinWorkout}
                />
                <View className="h-px bg-divider" />
              </>
            )}

            <ActionRow
              icon="flag"
              label="Lead a Crew Workout"
              detail="Build the exercise list — everyone else just logs reps & sets"
              onPress={onLeadWorkout}
            />
            <View className="h-px bg-divider" />
            <ActionRow icon="person" label="Start Solo Workout" onPress={onSoloWorkout} />
            <View className="h-px bg-divider" />
            <ActionRow icon="calendar-outline" label="Set Today's Training" onPress={onSetTodaysTraining} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
