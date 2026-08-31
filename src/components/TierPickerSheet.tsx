import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RankBadge } from "@/components/RankBadge";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankTier } from "@/lib/rank";
import { colors } from "@/theme";

type TierPickerSheetProps = {
  visible: boolean;
  title: string;
  selectedTier?: RankTier | null;
  onSelect: (tier: RankTier) => void;
  onClose: () => void;
};

/** Pick any of the 15 rank tiers — same bottom-sheet shape as WorkoutStatsTabs's MetricPickerSheet /
 * DuelChallengeSheet / ranks.tsx's SortMenu (Modal + fade + tap-to-pick rows), scrolled since 15
 * tiers don't fit on one screen. Used by ranks/build-your-graph.tsx's Dev Mode sandbox. */
export function TierPickerSheet({ visible, title, selectedTier, onSelect, onClose }: TierPickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        {/* Swallows taps so they don't bubble to the backdrop Pressable and close the sheet. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).mass(0.7)}
            style={{ paddingBottom: insets.bottom + 16, maxHeight: 460 }}
            className="gap-1 rounded-t-3xl border-t border-divider bg-surface p-4"
          >
            <Text className="heading-4 mb-2 text-text-primary">{title}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {RANK_TIERS.map((tier) => {
                const active = tier === selectedTier;
                return (
                  <Pressable
                    key={tier}
                    onPress={() => onSelect(tier)}
                    className="flex-row items-center gap-3 rounded-xl px-2 py-2.5"
                  >
                    <RankBadge tier={tier} size={30} />
                    <Text
                      className={active ? "body-md flex-1 font-body-semibold" : "body-md flex-1 text-text-primary"}
                      style={active ? { color: RANK_TIER_COLOR[tier] } : undefined}
                    >
                      {formatRankTier(tier)}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
