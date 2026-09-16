import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { colors } from "@/theme";

export type FilterOption<T extends string> = { key: T; label: string };

type FilterPickerSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: FilterOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  onClose: () => void;
};

/** Same bottom-sheet shape as ranks.tsx's SortMenu / TierPickerSheet / DuelChallengeSheet (Modal +
 * fade + tap-to-pick rows) — the app's established "compact trigger pill + sheet" pattern for a
 * single-select filter, used instead of a row of stretched full-width chips. */
export function FilterPickerSheet<T extends string>({ visible, title, options, selected, onSelect, onClose }: FilterPickerSheetProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxDynamicContentSize={460}>
      <Text className="heading-4 mb-2 px-4 pt-4 text-text-primary">{title}</Text>
      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {options.map((option) => {
          const active = option.key === selected;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                onSelect(option.key);
                onClose();
              }}
              className="flex-row items-center justify-between rounded-xl px-2 py-3"
            >
              <Text className={active ? "body-md font-body-semibold text-brand-yellow" : "body-md text-text-primary"}>
                {option.label}
              </Text>
              {active && <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />}
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
