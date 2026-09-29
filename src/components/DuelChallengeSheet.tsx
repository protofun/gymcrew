import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { HomeRowLead } from "@/components/HomeRowLead";
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

/** Propose a 1-on-1 Peer Duel with a crewmate — same bottom-sheet shell as every other sheet in the
 * app, its two options a flowing hairline-divided list (the same `HomeRowLead` circle every row in
 * Crew opens with) rather than a bordered card each. */
export function DuelChallengeSheet({ visible, memberName, onClose, onChallenge }: DuelChallengeSheetProps) {
  const weightUnit = useWeightUnit();
  const METRIC_OPTIONS = metricOptions(weightUnit);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-1 px-4 pb-4 pt-4">
        <Text className="heading-4 text-text-primary">Challenge {memberName}</Text>
        <Text className="body-sm mb-1 text-text-secondary">A quick 1-on-1 for today — pick what counts.</Text>

        <View>
          {METRIC_OPTIONS.map((option, index) => (
            <Pressable
              key={option.key}
              onPress={() => onChallenge(option.key)}
              className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${index === METRIC_OPTIONS.length - 1 ? "" : "border-b border-divider"}`}
            >
              <HomeRowLead kind="flat">
                <Ionicons name="flag-outline" size={18} color={colors.brand.yellow} />
              </HomeRowLead>
              <View className="flex-1">
                <Text className="body-md font-body-semibold text-text-primary">{option.label}</Text>
                <Text className="caption text-text-secondary">{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
            </Pressable>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
