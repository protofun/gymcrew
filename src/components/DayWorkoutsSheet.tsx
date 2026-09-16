import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
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
  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["50%", "90%"]}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <Text className="body-sm text-text-secondary">
          {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {workouts.length}{" "}
          workouts
        </Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <BottomSheetScrollView className="px-5" showsVerticalScrollIndicator={false}>
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
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
