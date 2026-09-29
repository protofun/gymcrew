import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors } from "@/theme";

/** The bottom sheet both goal screens (making one, and looking at one) sit in: it slides up over a dimmed page, has a handle on top and a
 * close button, and scrolls. It closes three ways — the X, a tap on the dimmed page, or by pulling the handle down. It carries its own
 * `GestureHandlerRootView`, which the rulers inside need in a modal. */
export function GoalSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const drag = useSharedValue(0);

  const pull = Gesture.Pan()
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 90 || event.velocityY > 900) {
        runOnJS(onClose)();
      }
      drag.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ maxHeight: "90%" }}>
            <Animated.View style={[{ borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.neutral.surface, maxHeight: "100%" }, sheetStyle]}>
              <GestureDetector gesture={pull}>
                <View className="items-center pb-2 pt-3" style={{ minHeight: 44 }}>
                  <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.neutral.divider }} />
                </View>
              </GestureDetector>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" className="absolute right-4 top-3 z-10 h-9 w-9 items-center justify-center rounded-full border border-divider bg-background">
                <Ionicons name="close" size={18} color={colors.neutral.textPrimary} />
              </Pressable>
              <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
