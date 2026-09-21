import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountPicker } from "@/components/AmountPicker";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { colors, fontFamily } from "@/theme";

type GoalWeightSheetProps = {
  visible: boolean;
  unit: "kg" | "lbs";
  /** Where the ruler starts — the current goal, or the current weight. */
  initialValue: number;
  onSave: (value: number) => void;
  onClose: () => void;
};

/** A bottom sheet to set the goal weight by dragging a ruler (Reacticx `ruler`) instead of typing. */
export function GoalWeightSheet({ visible, unit, initialValue, onSave, onClose }: GoalWeightSheetProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const isKg = unit === "kg";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
        <View style={{ paddingBottom: insets.bottom + 16, backgroundColor: colors.neutral.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32 }} className="gap-6 px-5 pt-5">
          <View className="items-center gap-1">
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral.divider }} />
            <AnimatedText
              text="GOAL WEIGHT"
              animationConfig={{ characterDelay: 30 }}
              enterFrom={{ translateY: 28, scale: 0.4 }}
              style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white, marginTop: 12 }}
            />
            <Text className="body-sm text-text-secondary">Drag the ruler to where you want to be.</Text>
          </View>

          <AmountPicker value={value} unit={unit} min={isKg ? 30 : 66} max={isKg ? 200 : 440} step={isKg ? 0.5 : 1} onChange={setValue} />

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 items-center rounded-full border border-divider py-3.5">
              <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(value)} className="flex-1 items-center rounded-full bg-brand-yellow py-3.5">
              <Text className="body-md font-body-semibold text-brand-iron">Save goal</Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
