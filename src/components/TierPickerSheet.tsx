import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { Tray } from "@/components/ui/organisms/tray";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankTier } from "@/lib/rank";
import { colors, fontFamily } from "@/theme";

const TRAY_PALETTE = {
  surface: colors.neutral.surface,
  border: colors.neutral.divider,
  handle: colors.neutral.divider,
  text: colors.brand.white,
  mutedText: colors.neutral.textSecondary,
  backdrop: "rgba(0,0,0,0.6)",
};

type TierPickerSheetProps = {
  visible: boolean;
  title: string;
  selectedTier?: RankTier | null;
  onSelect: (tier: RankTier) => void;
  onClose: () => void;
};

/** Pick any of the 15 rank tiers — used by `whats-my-rank.tsx`'s Simulator step, `workout-
 * split/setup.tsx`, and `ranks/build-your-graph.tsx`'s Dev Mode sandbox.
 *
 * Built on the real Reacticx `organisms/tray`, not the shared gorhom `BottomSheet` this used to use
 * — a real, reported bug ("HEEL BELANGRIJK... nergens in de app kan ik hier naar beneden scrollen"):
 * with 15 rows this sheet genuinely can't be scrolled to its bottom few tiers (Titan/Mythic/
 * Immortal/Legend cut off past Champion), reproduced on a real device, not just the already-
 * documented desktop-mouse-wheel gap this file used to attribute this class of complaint to.
 * `snapPoints` (the already-established fix for gorhom's OWN `maxDynamicContentSize` auto-sizing
 * bug) was already in place here and didn't help — this is a different failure, somewhere in
 * gorhom's own sheet-drag/scroll gesture handoff, not the sizing bug that fix targets. `Tray`
 * doesn't share that code at all — its `Tray.ScrollView` is a plain `Animated.ScrollView` wrapped in
 * its own `GestureDetector` (`Gesture.Native().simultaneousWithExternalGesture(pan)`), not gorhom's
 * `BottomSheetScrollView` — switching to it sidesteps whatever in gorhom's own gesture code was
 * eating the scroll, the same way it already did for the exercise-filters sheet (round 19). */
export function TierPickerSheet({ visible, title, selectedTier, onSelect, onClose }: TierPickerSheetProps) {
  return (
    <Tray
      theme="dark"
      palette={TRAY_PALETTE}
      defaultView="tiers"
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      detents={["55%", "88%"]}
      radius={24}
    >
      <Tray.Content>
        <Tray.View id="tiers">
          <Tray.Header>
            <Tray.Title style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 20, fontWeight: undefined }}>{title}</Tray.Title>
            <Tray.Close>{({ color, size }) => <Ionicons name="close" size={size} color={color} />}</Tray.Close>
          </Tray.Header>

          <Tray.ScrollView maxHeight={640} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {RANK_TIERS.map((tier) => {
              const active = tier === selectedTier;
              return (
                <Pressable key={tier} onPress={() => onSelect(tier)} className="flex-row items-center gap-3 rounded-xl px-2 py-2.5">
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
          </Tray.ScrollView>
        </Tray.View>
      </Tray.Content>
    </Tray>
  );
}
