import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
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
  return (
    <BottomSheet visible={visible} onClose={onClose} maxDynamicContentSize={460}>
      <Text className="heading-4 mb-2 px-4 pt-4 text-text-primary">{title}</Text>
      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
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
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
