import { Text, View } from "react-native";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatWeight } from "@/lib/units";
import type { Gender } from "@/store/onboarding-store";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see pr-celebration.tsx / ranks.tsx for the same constraint.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

const nameStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const statValueStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 24,
  lineHeight: 26,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function ShareStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text style={statValueStyle} className="text-text-primary">
        {value}
      </Text>
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

type WorkoutShareCardProps = {
  workout: CompletedWorkout;
  gender: Gender;
};

/** The "share this workout" card — captured to a PNG and handed to the native share sheet (see
 * `ShareCardModal`). Flat `bg-surface`, not a tier-colored gradient — the same canonical card
 * language as `RankRevealCard` (What's my rank? / PR share / PR celebration), so every share/reveal
 * surface in the app looks consistent instead of this one having its own different treatment.
 * Deliberately leaner than the results screen itself: only what's worth putting on a poster
 * (name/date, headline stats, one visual). Individual PRs get their own card (`PrShareCard`)
 * rather than being listed here too. */
export function WorkoutShareCard({ workout, gender }: WorkoutShareCardProps) {
  const weightUnit = useWeightUnit();

  return (
    <View className="gap-5 rounded-3xl border border-divider bg-surface p-5">
      <Text style={wordmarkStyle} className="text-center">
        <Text className="text-text-primary">GYM</Text>
        <Text className="text-brand-yellow">CREW</Text>
      </Text>

      <View className="items-center gap-1">
        <Text style={nameStyle} className="text-center text-text-primary">
          {workout.name.toUpperCase()}
        </Text>
        <Text className="caption text-text-secondary">
          {new Date(workout.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </Text>
      </View>

      <View className="flex-row items-center rounded-2xl border border-divider bg-background py-4">
        <ShareStat
          label="DURATION"
          value={
            workout.durationSeconds >= 3600
              ? `${Math.floor(workout.durationSeconds / 3600)}h ${Math.round((workout.durationSeconds % 3600) / 60)}m`
              : `${Math.round(workout.durationSeconds / 60)}m`
          }
        />
        <ShareStat label="VOLUME" value={formatWeight(workout.volumeKg, weightUnit)} />
        <ShareStat label="SETS" value={String(workout.completedSets)} />
      </View>

      {Object.keys(workout.muscleIntensity).length > 0 && (
        <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={150} showLegend={false} gender={gender} />
      )}

      <Text className="caption text-center text-text-secondary">Track it. Rank it. GymCrew.</Text>
    </View>
  );
}
