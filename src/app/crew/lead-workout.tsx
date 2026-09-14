import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { colors } from "@/theme";

/**
 * No pre-planning — the leader just names the session and starts training normally. Whatever
 * exercises/sets they actually log get mirrored to the crew's shared live session as they go (see
 * workout/active.tsx's push effect), not chosen up front. That used to require building the whole
 * exercise list before starting, which was too much friction for anyone to actually use.
 */
export default function LeadWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const today = useTodayWorkout();
  const [name, setName] = useState(today.isRestDay ? "" : today.workoutName);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setWorkoutName = useActiveWorkoutStore((state) => state.setName);
  const startSession = useLedWorkoutStore((state) => state.startSession);

  const canStart = name.trim().length > 0 && !starting;

  async function handleStartLeading() {
    if (!canStart) return;
    const trimmedName = name.trim();
    setStarting(true);
    setError(null);
    const result = await startSession(trimmedName, []);
    setStarting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Leading a session always starts fresh — discard first since `startWorkout` now leaves an
    // already-in-progress workout untouched rather than overwriting it (see active-workout-store.ts).
    discardWorkout();
    startWorkout();
    setWorkoutName(trimmedName);
    posthog.capture("crew_workout_led");
    router.replace({ pathname: "/workout/active", params: { leadingCrew: "1" } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Lead a Crew Workout</Text>
      </View>

      <View className="flex-1 gap-4 px-4 pt-6">
        <View className="items-center gap-2 px-4 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-surface">
            <Ionicons name="flag" size={26} color={colors.brand.yellow} />
          </View>
          <Text className="body-md text-center text-text-secondary">
            Name your session and start training — your crew sees what you&apos;re doing as you log it, live.
            No need to plan it out first.
          </Text>
        </View>

        <View className="gap-1.5">
          <Text className="body-sm text-text-secondary">Workout Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day"
            placeholderTextColor={colors.neutral.textSecondary}
            className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
            style={{ outlineWidth: 0, outlineColor: "transparent" }}
          />
        </View>

        {error && (
          <View className="flex-row items-start gap-2 rounded-2xl border border-error/40 bg-error/10 p-3">
            <Ionicons name="warning" size={16} color={colors.semantic.error} style={{ marginTop: 1 }} />
            <Text className="body-sm flex-1 text-text-secondary">{error}</Text>
          </View>
        )}
      </View>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable
          onPress={handleStartLeading}
          disabled={!canStart}
          className={`items-center rounded-full py-4 ${canStart ? "bg-brand-yellow" : "bg-surface"}`}
        >
          <Text className={`body-lg font-body-semibold ${canStart ? "text-brand-iron" : "text-text-secondary"}`}>
            {starting ? "Starting…" : "Start Leading"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
