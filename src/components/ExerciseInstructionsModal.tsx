import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { MuscleGroupPicker } from "@/components/MuscleGroupPicker";
import type { Exercise } from "@/data/exercises";
import type { MuscleGroup } from "@/data/workout-log";
import { resolveMuscleGroup } from "@/lib/muscle-groups";
import { colors } from "@/theme";

type ExerciseInstructionsModalProps = {
  /** `null` closes the modal — pass the exercise to show. */
  exercise: Exercise | null;
  onClose: () => void;
};

function uniqueGroups(names: string[]): MuscleGroup[] {
  return Array.from(new Set(names.map(resolveMuscleGroup).filter((group): group is MuscleGroup => group !== null)));
}

export function ExerciseInstructionsModal({ exercise, onClose }: ExerciseInstructionsModalProps) {
  const primaryGroups = uniqueGroups(exercise?.primaryMuscles ?? []);
  const secondaryGroups = uniqueGroups(exercise?.secondaryMuscles ?? []).filter((group) => !primaryGroups.includes(group));
  const primaryMuscle = primaryGroups[0] ?? null;
  // MuscleGroupPicker only highlights one "primary" color — any extra primary muscles (rare) fold
  // into the secondary highlight rather than being dropped.
  const secondaryMuscles = [...primaryGroups.slice(1), ...secondaryGroups];

  return (
    <Modal visible={exercise !== null} transparent animationType="fade" onRequestClose={onClose}>
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
          style={{ maxHeight: "85%" }}
        >
          {exercise && (
            <>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="heading-4 flex-1 text-text-primary" numberOfLines={2}>
                  {exercise.name}
                </Text>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {!!exercise.imageUrl && (
                  <Image source={{ uri: exercise.imageUrl }} className="h-48 w-full rounded-2xl bg-background" resizeMode="cover" />
                )}

                {(primaryMuscle || secondaryMuscles.length > 0) && (
                  <View className="gap-2">
                    <Text className="caption font-body-semibold text-text-secondary">MUSCLES WORKED</Text>
                    <MuscleGroupPicker primaryMuscle={primaryMuscle} secondaryMuscles={secondaryMuscles} height={220} />
                  </View>
                )}

                {exercise.instructions.length > 0 && (
                  <View className="gap-3">
                    {exercise.instructions.map((step, index) => (
                      <View key={index} className="flex-row gap-3">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-yellow/15">
                          <Text className="caption font-body-semibold text-brand-yellow">{index + 1}</Text>
                        </View>
                        <Text className="body-sm flex-1 text-text-secondary">{step}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
