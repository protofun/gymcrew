import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EXERCISE_BY_ID, formatMuscleName } from "@/data/exercises";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { colors } from "@/theme";

export default function JoinWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const session = useLedWorkoutStore((state) => state.session);
  const join = useLedWorkoutStore((state) => state.join);
  const members = useCrewStore((state) => state.members);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setWorkoutName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);

  if (!session) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-text-secondary">No crew workout is active right now.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const exercises = session.exerciseIds.map((id) => EXERCISE_BY_ID[id]).filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));
  const participants = session.participantIds.map((id) => members.find((member) => member.id === id)).filter((member): member is NonNullable<typeof member> => Boolean(member));

  function handleJoin() {
    join(CURRENT_MEMBER_ID);
    startWorkout();
    setWorkoutName(session!.workoutName);
    for (const exercise of exercises) addExercise(exercise);
    router.replace("/workout/active");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Join Workout</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-2">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-surface">
            <Ionicons name="flag" size={22} color={colors.brand.yellow} />
          </View>
          <Text className="heading-4 text-text-primary">{session.workoutName}</Text>
          <Text className="body-sm text-text-secondary">Led by {session.leaderName}</Text>
        </View>

        {participants.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-2">
            {participants.map((participant) => (
              <View key={participant.id} className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
                <Image source={{ uri: participant.avatarUrl }} className="rounded-full bg-divider" style={{ width: 18, height: 18 }} />
                <Text className="caption text-text-secondary">{participant.name}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="gap-2">
          <Text className="body-sm text-text-secondary">
            {exercises.length} exercise{exercises.length === 1 ? "" : "s"} — you&apos;ll just log your own reps &amp; sets
          </Text>
          <View className="gap-3">
            {exercises.map((exercise) => (
              <View key={exercise.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
                {exercise.imageUrl ? (
                  <Image source={{ uri: exercise.imageUrl }} className="h-12 w-12 rounded-xl bg-background" />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-background">
                    <Ionicons name="barbell-outline" size={20} color={colors.neutral.textSecondary} />
                  </View>
                )}
                <View className="flex-1 gap-0.5">
                  <Text className="body-md font-body-semibold text-text-primary">{exercise.name}</Text>
                  {!!exercise.primaryMuscles[0] && (
                    <Text className="caption text-brand-yellow">{formatMuscleName(exercise.primaryMuscles[0])}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable onPress={handleJoin} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-lg font-body-semibold text-brand-iron">Join Workout</Text>
        </Pressable>
      </View>
    </View>
  );
}
