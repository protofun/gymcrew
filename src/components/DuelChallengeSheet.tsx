import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { colors } from "@/theme";

export type DuelMetric = "volume" | "sets";

function metricOptions(weightUnit: string): { key: DuelMetric; label: string; description: string }[] {
  return [
    { key: "volume", label: "Most Volume Today", description: `Whoever logs more total ${weightUnit} by the end of today wins.` },
    { key: "sets", label: "Most Sets Today", description: "Whoever logs more completed sets by the end of today wins." },
  ];
}

type DuelChallengeSheetProps = {
  visible: boolean;
  memberName: string | null;
  onClose: () => void;
  onChallenge: (metric: DuelMetric) => void;
};

/** Propose a 1-on-1 Peer Duel with a crewmate — same bottom-sheet pattern as WorkoutStatsTabs's
 * MetricPickerSheet (a plain tap-to-pick list, no text input, so there's no keyboard to dodge). */
export function DuelChallengeSheet({ visible, memberName, onClose, onChallenge }: DuelChallengeSheetProps) {
  const weightUnit = useWeightUnit();
  const METRIC_OPTIONS = metricOptions(weightUnit);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-3 px-4 pb-2 pt-4">
        <Text className="heading-4 text-text-primary">Challenge {memberName}</Text>
        <Text className="body-sm text-text-secondary">A quick 1-on-1 for today — pick what counts.</Text>

        <View className="mt-1 gap-2">
          {METRIC_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => onChallenge(option.key)}
              className="flex-row items-center gap-3 rounded-2xl border border-divider bg-background px-3 py-3"
            >
              <Ionicons name="flag-outline" size={18} color={colors.brand.yellow} />
              <View className="flex-1">
                <Text className="body-md font-body-semibold text-text-primary">{option.label}</Text>
                <Text className="caption text-text-secondary">{option.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
