import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EXERCISE_BY_ID } from "@/data/exercises";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useCrewStore } from "@/store/crew-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { colors } from "@/theme";

/** No websockets in this backend (see crew-live-sessions.php) — polling is how "live" works here. */
const POLL_INTERVAL_MS = 15000;

export default function JoinWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useLedWorkoutStore((state) => state.session);
  const refresh = useLedWorkoutStore((state) => state.refresh);
  const join = useLedWorkoutStore((state) => state.join);
  const members = useCrewStore((state) => state.members);
  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setWorkoutName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const participants = session.participantIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is NonNullable<typeof member> => Boolean(member));

  async function handleJoin() {
    if (!session || joining) return;
    setJoining(true);
    setError(null);
    const result = await join();
    setJoining(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Joining a crew's live session always starts a fresh workout from their current progress —
    // discard first since `startWorkout` now leaves an already-in-progress workout untouched
    // rather than overwriting it (see active-workout-store.ts).
    discardWorkout();
    startWorkout();
    setWorkoutName(session.workoutName);
    // Snapshot of whatever the leader has logged so far — a starting point, not a live mirror.
    // Anything the leader adds after this point stays theirs; each person logs independently from here.
    for (const logged of session.exercises) {
      const exercise = EXERCISE_BY_ID[logged.exerciseId];
      if (exercise) addExercise(exercise);
    }
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
          <Text className="body-sm text-text-secondary">Led by {session.leaderName} · training live</Text>
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
            {session.exercises.length === 0
              ? "Nothing logged yet — join now and you'll both add exercises as you go."
              : `${session.exercises.length} exercise${session.exercises.length === 1 ? "" : "s"} so far — you'll start from here and log your own reps & sets`}
          </Text>
          <View className="gap-3">
            {session.exercises.map((exercise, index) => (
              <View key={`${exercise.exerciseId}-${index}`} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
                {exercise.imageUrl ? (
                  <Image source={{ uri: exercise.imageUrl }} className="h-12 w-12 rounded-xl bg-background" />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-background">
                    <Ionicons name="barbell-outline" size={20} color={colors.neutral.textSecondary} />
                  </View>
                )}
                <View className="flex-1 gap-0.5">
                  <Text className="body-md font-body-semibold text-text-primary">{exercise.name}</Text>
                  {!!exercise.primaryMuscle && <Text className="caption text-brand-yellow">{exercise.primaryMuscle}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }} className="gap-2">
        {error && (
          <View className="flex-row items-start gap-2 rounded-2xl border border-error/40 bg-error/10 p-3">
            <Ionicons name="warning" size={16} color={colors.semantic.error} style={{ marginTop: 1 }} />
            <Text className="body-sm flex-1 text-text-secondary">{error}</Text>
          </View>
        )}
        <Pressable onPress={handleJoin} disabled={joining} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-lg font-body-semibold text-brand-iron">{joining ? "Joining…" : "Join Workout"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
