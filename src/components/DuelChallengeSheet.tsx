import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

export type DuelMetric = "volume" | "sets";

const METRIC_OPTIONS: { key: DuelMetric; label: string; description: string }[] = [
  { key: "volume", label: "Most Volume Today", description: "Whoever logs more total kg by the end of today wins." },
  { key: "sets", label: "Most Sets Today", description: "Whoever logs more completed sets by the end of today wins." },
];

type DuelChallengeSheetProps = {
  visible: boolean;
  memberName: string | null;
  onClose: () => void;
  onChallenge: (metric: DuelMetric) => void;
};

/** Propose a 1-on-1 Peer Duel with a crewmate — same bottom-sheet pattern as WorkoutStatsTabs's
 * MetricPickerSheet (a plain tap-to-pick list, no text input, so there's no keyboard to dodge). */
export function DuelChallengeSheet({ visible, memberName, onClose, onChallenge }: DuelChallengeSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        {/* Swallows taps so they don't bubble to the backdrop Pressable and close the sheet. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).mass(0.7)}
            style={{ paddingBottom: insets.bottom + 16 }}
            className="gap-3 rounded-t-3xl border-t border-divider bg-surface p-4"
          >
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
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
