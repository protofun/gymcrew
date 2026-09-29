import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { WorkoutListRow } from "@/components/WorkoutListRow";
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
          <WorkoutListRow
            key={workout.id}
            name={workout.name}
            dateLabel={new Date(workout.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            detail={`${workout.completedSets} sets · ${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`}
            hasPr={workout.prs.length > 0}
            isLast={index === workouts.length - 1}
            onPress={() => onSelectWorkout(workout)}
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
