import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

type DayWorkoutsSheetProps = {
  visible: boolean;
  date: Date | null;
  workouts: CompletedWorkout[];
  onClose: () => void;
  onSelectWorkout: (workout: CompletedWorkout) => void;
};

export function DayWorkoutsSheet({ visible, date, workouts, onClose, onSelectWorkout }: DayWorkoutsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18).mass(0.7)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}
        >
          <Pressable onPress={() => {}} className="gap-1 rounded-t-3xl border border-divider bg-surface px-5 pb-2 pt-4">
            <Text className="body-sm mb-2 text-text-secondary">
              {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} ·{" "}
              {workouts.length} workouts
            </Text>

            {workouts.map((workout, index) => (
              <View key={workout.id}>
                {index > 0 && <View className="h-px bg-divider" />}
                <Pressable
                  onPress={() => onSelectWorkout(workout)}
                  className="flex-row items-center gap-3 py-3.5"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
                    <Ionicons
                      name={workout.prs.length > 0 ? "trophy" : "barbell-outline"}
                      size={18}
                      color={workout.prs.length > 0 ? colors.brand.yellow : colors.neutral.textSecondary}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="body-md font-body-semibold text-text-primary">{workout.name}</Text>
                    <Text className="caption text-text-secondary">
                      {new Date(workout.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ·{" "}
                      {workout.completedSets} sets · {workout.volumeKg.toLocaleString("en-US")} {workout.unit}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
