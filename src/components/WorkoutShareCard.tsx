import { useWindowDimensions, View } from "react-native";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { ShareFrame } from "@/components/ShareFrame";
import { ReceiptCard } from "@/components/ui/pieces/receipt-card";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatWeight } from "@/lib/units";
import type { Gender } from "@/store/onboarding-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

type WorkoutShareCardProps = {
  workout: CompletedWorkout;
  gender: Gender;
};

function formatDuration(seconds: number): string {
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m` : `${Math.round(seconds / 60)}m`;
}

/** The "share this workout" picture — captured to a PNG and handed to the native share sheet (see `ShareCardModal`). The muscles you
 * trained on top, and under them the workout as a receipt (Reacticx `receipt-card`): itemised, with the volume as the total. */
export function WorkoutShareCard({ workout, gender }: WorkoutShareCardProps) {
  const weightUnit = useWeightUnit();
  const { width } = useWindowDimensions();
  const receiptWidth = Math.min(width - 96, 320);

  return (
    <ShareFrame>
      {Object.keys(workout.muscleIntensity).length > 0 && (
        <View className="items-center">
          <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={150} showLegend={false} showViewLabel={false} gender={gender} />
        </View>
      )}

      <ReceiptCard.Root width={receiptWidth}>
        <ReceiptCard.Header>
          <ReceiptCard.Store>{workout.name.toUpperCase()}</ReceiptCard.Store>
          <ReceiptCard.Meta>{new Date(workout.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</ReceiptCard.Meta>
        </ReceiptCard.Header>
        <ReceiptCard.Separator />
        <ReceiptCard.Items>
          <ReceiptCard.Item label="DURATION" value={formatDuration(workout.durationSeconds)} />
          <ReceiptCard.Item label="EXERCISES" value={String(workout.exercises.length)} />
          <ReceiptCard.Item label="SETS" value={String(workout.completedSets)} />
          <ReceiptCard.Item label="NEW PRS" value={String(workout.prs.length)} />
        </ReceiptCard.Items>
        <ReceiptCard.Separator variant="solid" />
        <ReceiptCard.Total label="VOLUME" value={formatWeight(workout.volumeKg, weightUnit)} />
        <ReceiptCard.Barcode code={workout.id.slice(-10).toUpperCase()} />
        <ReceiptCard.TornEdge side="bottom" />
      </ReceiptCard.Root>
    </ShareFrame>
  );
}
