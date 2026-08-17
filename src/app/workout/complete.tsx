import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Dimensions, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { images } from "@/constants/images";
import { formatElapsed } from "@/hooks/use-elapsed-timer";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const SCREEN_HORIZONTAL_PADDING = 24;
// An explicit pixel width computed from the screen, not a `width: "100%"` percentage — percentage
// sizing on an Image nested in a ScrollView's content container has proven unreliable on native
// with this project's setup (same class of issue as the earlier contentContainerClassName bug):
// it rendered correctly on web but overflowed past the screen edges on device.
const MASCOT_WIDTH = Dimensions.get("window").width - SCREEN_HORIZONTAL_PADDING * 2;

function StatItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1.5">
      <Ionicons name={icon} size={18} color={colors.brand.yellow} />
      <Text className="heading-4 text-text-primary">{value}</Text>
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

function VDivider() {
  return <View className="h-10 w-px bg-divider" />;
}

export default function WorkoutCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkoutHistoryStore((state) => state.workouts.find((w) => w.id === id));
  const posthog = usePostHog();

  useEffect(() => {
    if (workout && workout.prs.length > 0) {
      posthog.capture("personal_record_achieved", {
        pr_count: workout.prs.length,
        top_exercise: workout.prs[0]?.exerciseName,
        workout_name: workout.name,
      });
    }
  }, [workout, posthog]);

  if (!workout) {
    router.replace("/home");
    return null;
  }

  const topPr = workout.prs[0];
  const extraPrCount = workout.prs.length - 1;

  function goToSummary() {
    if (workout!.prs.length > 0) {
      router.replace({ pathname: "/workout/pr-celebration", params: { id: workout!.id } });
    } else {
      router.replace({ pathname: "/workout/summary", params: { id: workout!.id } });
    }
  }

  function goHome() {
    router.replace("/home");
  }

  return (
    // contentContainerStyle is all-inline, not contentContainerClassName — mixing the two is
    // unreliable on native with this project's NativeWind preview version (same class of bug as
    // the TextInput textAlign crash: looks right on web, silently drops or conflicts on native).
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        alignItems: "center",
        gap: 32,
        paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
        paddingTop: insets.top + 32,
        paddingBottom: insets.bottom + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="relative" style={{ width: MASCOT_WIDTH }}>
        <Image
          source={topPr ? images.mascotAuthScreen : images.mascotFlexing}
          resizeMode="contain"
          style={{ width: MASCOT_WIDTH, height: MASCOT_WIDTH / (topPr ? 760 / 430 : 250 / 205) }}
        />
        {topPr && (
          <View
            className="absolute items-center justify-center rounded-full bg-brand-yellow"
            style={{ top: 0, right: 12, width: 52, height: 52, borderWidth: 3, borderColor: colors.neutral.background }}
          >
            <Ionicons name="trophy" size={24} color={colors.brand.iron} />
          </View>
        )}
      </View>

      {topPr ? (
        <View className="items-center gap-1.5">
          <Text className="heading-3 text-center text-text-primary">New Personal Record!</Text>
          <Text className="body-lg font-body-semibold text-brand-yellow">{topPr.exerciseName}</Text>
          <Text className="heading-4 mt-1 text-text-primary">
            {topPr.weightKg}
            {workout.unit} × {topPr.reps} reps
          </Text>
          {topPr.previousBestKg !== null ? (
            <Text className="body-md font-body-semibold text-success">
              +{Math.round((topPr.weightKg - topPr.previousBestKg) * 10) / 10}
              {workout.unit} from last time
            </Text>
          ) : (
            <Text className="body-md text-text-secondary">First time logging this lift</Text>
          )}
          {extraPrCount > 0 && (
            <Text className="body-sm text-text-secondary">
              +{extraPrCount} more record{extraPrCount > 1 ? "s" : ""} this session
            </Text>
          )}
        </View>
      ) : (
        <View className="items-center gap-1.5">
          <Text className="heading-3 text-center text-text-primary">Workout Complete!</Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flame" size={16} color={colors.semantic.streak} />
            <Text className="body-lg font-body-semibold text-text-secondary">{workout.name}</Text>
          </View>
        </View>
      )}

      <View className="w-full flex-row items-center justify-between">
        <StatItem icon="time-outline" label="Duration" value={formatElapsed(workout.durationSeconds)} />
        <VDivider />
        <StatItem icon="barbell-outline" label="Volume" value={`${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`} />
        <VDivider />
        <StatItem icon="layers-outline" label="Sets" value={String(workout.completedSets)} />
      </View>

      {Object.keys(workout.muscleIntensity).length > 0 && (
        <View className="w-full items-center gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Muscles Trained</Text>
          <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={160} showLegend={false} />
        </View>
      )}

      <View className="w-full gap-3">
        {topPr && (
          <Pressable
            onPress={() => router.push("/ranks")}
            className="flex-row items-center justify-center gap-2 rounded-full border border-divider py-4"
          >
            <Ionicons name="trophy-outline" size={18} color={colors.neutral.textPrimary} />
            <Text className="body-lg font-body-semibold text-text-primary">View Rankings</Text>
          </Pressable>
        )}

        <Pressable
          onPress={goToSummary}
          className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-lg font-body-semibold text-brand-iron">View Summary</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
        </Pressable>

        <Pressable onPress={goHome} className="items-center py-2">
          <Text className="body-md text-text-secondary">Back to Home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
