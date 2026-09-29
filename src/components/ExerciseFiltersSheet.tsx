import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { MultiPillRow } from "@/components/PillRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Tray } from "@/components/ui/organisms/tray";
import { EXERCISE_EQUIPMENT_OPTIONS, EXERCISE_MUSCLE_OPTIONS, formatMuscleName } from "@/data/exercises";
import { colors, fontFamily } from "@/theme";

const sectionLabelStyle = { fontFamily: fontFamily.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary };

const EQUIPMENT_OPTIONS = EXERCISE_EQUIPMENT_OPTIONS.map((value) => ({ key: value, label: formatMuscleName(value) }));
const MUSCLE_OPTIONS = EXERCISE_MUSCLE_OPTIONS.map((value) => ({ key: value, label: formatMuscleName(value) }));

const TRAY_PALETTE = {
  surface: colors.neutral.surface,
  border: colors.neutral.divider,
  handle: colors.neutral.divider,
  text: colors.brand.white,
  mutedText: colors.neutral.textSecondary,
  backdrop: "rgba(0,0,0,0.6)",
};

type ExerciseFiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  equipment: string[];
  onToggleEquipment: (value: string) => void;
  muscles: string[];
  onToggleMuscle: (value: string) => void;
  onClear: () => void;
  resultCount: number;
};

/** Equipment + muscle-group filters for the exercise picker — a real vendored Reacticx `organisms/
 * tray`, not a hand-rolled `Modal`. The first-pass version of this sheet used a plain `<Modal
 * transparent>` because nesting the app's usual `BottomSheet` (built on `@gorhom/bottom-sheet`)
 * inside `ExercisePickerModal`'s own already-open native `Modal` silently failed on web — that
 * gorhom sheet portals into a host mounted once at the app root, so it rendered BEHIND the outer
 * Modal instead of in front of it. `Tray` doesn't have that problem: it manages its own `Modal` and
 * its own pan gesture directly (no external provider/portal host to lose), so nesting it inside
 * another `Modal` works the same way `FanMenu`'s own `<Modal transparent>` fix already does
 * elsewhere in this app — and unlike that first-pass sheet, it's the genuine article: real detents
 * (`55%`/`85%`), a real drag-to-dismiss gesture, its own themed palette (overridden here to the
 * app's own surface/divider/text colors instead of the vendor's generic dark theme). */
export function ExerciseFiltersSheet({ visible, onClose, equipment, onToggleEquipment, muscles, onToggleMuscle, onClear, resultCount }: ExerciseFiltersSheetProps) {
  const activeCount = equipment.length + muscles.length;

  return (
    <Tray
      theme="dark"
      palette={TRAY_PALETTE}
      defaultView="filters"
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      detents={["55%", "85%"]}
      radius={24}
    >
      <Tray.Content>
        <Tray.View id="filters">
          <Tray.Header>
            <Tray.Title style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 20, fontWeight: undefined }}>Filters</Tray.Title>
            <Tray.Close>{({ color, size }) => <Ionicons name="close" size={size} color={color} />}</Tray.Close>
          </Tray.Header>

          {activeCount > 0 && (
            <View className="flex-row justify-end px-5">
              <Pressable onPress={onClear} hitSlop={8}>
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.brand.yellow }}>Clear all</Text>
              </Pressable>
            </View>
          )}

          <Tray.ScrollView maxHeight={640} contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingBottom: 8 }}>
            <View className="gap-2.5">
              <Text style={sectionLabelStyle}>EQUIPMENT</Text>
              <MultiPillRow options={EQUIPMENT_OPTIONS} values={equipment} onToggle={onToggleEquipment} wrap />
            </View>

            <View className="gap-2.5">
              <Text style={sectionLabelStyle}>MUSCLE GROUP</Text>
              <MultiPillRow options={MUSCLE_OPTIONS} values={muscles} onToggle={onToggleMuscle} wrap />
            </View>
          </Tray.ScrollView>

          <Tray.Footer>
            <PrimaryButton label={resultCount > 0 ? `Show ${resultCount} results` : "Show results"} onPress={onClose} disabled={resultCount === 0} />
          </Tray.Footer>
        </Tray.View>
      </Tray.Content>
    </Tray>
  );
}
