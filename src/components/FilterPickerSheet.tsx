import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
