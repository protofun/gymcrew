import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useGoalsStore } from "@/store/goals-store";
import { colors } from "@/theme";

const ICON_OPTIONS = ["barbell", "body", "walk", "bicycle", "timer", "flame", "water", "ribbon"];

// brand.green and semantic.success are the same color, so only one appears here.
const COLOR_OPTIONS = [
  colors.brand.yellow,
  colors.semantic.info,
  colors.semantic.success,
  colors.semantic.streak,
  colors.semantic.error,
];

type AddGoalModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const addGoal = useGoalsStore((state) => state.addGoal);

  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [targetDraft, setTargetDraft] = useState("");
  const [unit, setUnit] = useState("");

  const reset = () => {
    setLabel("");
    setIcon(ICON_OPTIONS[0]);
    setColor(COLOR_OPTIONS[0]);
    setTargetDraft("");
    setUnit("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = () => {
    if (!label.trim()) return;
    addGoal({
      label: label.trim(),
      icon,
      color,
      metric: "custom",
      direction: "increase",
      trackingMode: "manual",
      startValue: 0,
      targetValue: parseFloat(targetDraft) || 100,
      manualCurrentValue: 0,
      unit: unit.trim() || "%",
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
        >
          <Pressable onPress={handleClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <Text className="heading-4 pr-6 text-text-primary">New Goal</Text>

          <View className="gap-1">
            <Text className="caption text-text-secondary">Goal name</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Run a 5K"
              placeholderTextColor={colors.neutral.textSecondary}
              className="body-md rounded-xl bg-background p-3 text-text-primary"
            />
          </View>

          <View className="gap-1">
            <Text className="caption text-text-secondary">Icon</Text>
            <View className="flex-row flex-wrap gap-2">
              {ICON_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setIcon(option)}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    icon === option ? "bg-brand-yellow" : "bg-background"
                  }`}
                >
                  <Ionicons
                    name={option as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={icon === option ? colors.brand.iron : colors.neutral.textSecondary}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-1">
            <Text className="caption text-text-secondary">Color</Text>
            <View className="flex-row flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setColor(option)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: option }}
                >
                  {color === option && <Ionicons name="checkmark" size={18} color={colors.brand.iron} />}
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text className="caption text-text-secondary">Target</Text>
              <TextInput
                value={targetDraft}
                onChangeText={setTargetDraft}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl bg-background p-3 text-text-primary"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="caption text-text-secondary">Unit</Text>
              <TextInput
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g. km"
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl bg-background p-3 text-text-primary"
              />
            </View>
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!label.trim()}
            className={`items-center rounded-full py-3 ${label.trim() ? "bg-brand-yellow" : "bg-divider"}`}
          >
            <Text className={`body-md font-body-bold ${label.trim() ? "text-brand-iron" : "text-text-secondary"}`}>
              Create Goal
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
