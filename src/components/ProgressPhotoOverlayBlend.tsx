import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Slider } from "@/components/Slider";
import { formatDiaryDate } from "@/lib/date";
import { colors } from "@/theme";

const IMAGE_HEIGHT = 420;

type PhotoRef = { photoUrl: string; capturedAt: number };

type Props = {
  before: PhotoRef;
  after: PhotoRef;
};

/**
 * Drag-to-align ghost overlay: `after` sits on top of `before` as a semi-transparent layer you can
 * reposition by hand (useful when the two photos weren't taken from the exact same distance/angle,
 * so a landmark like a shoulder or hip needs nudging into place) and fade with the opacity slider —
 * a different read than `ProgressPhotoOverlay`'s hard left/right slide reveal: both photos ghosted
 * together at once, rather than a clean split.
 */
export function ProgressPhotoOverlayBlend({ before, after }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [opacityPercent, setOpacityPercent] = useState(50);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function resetPosition() {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <View className="gap-3">
      <View onLayout={handleLayout} style={{ height: IMAGE_HEIGHT }} className="w-full overflow-hidden rounded-2xl bg-surface">
        {containerWidth > 0 && (
          <>
            <Image source={{ uri: before.photoUrl }} style={{ width: containerWidth, height: IMAGE_HEIGHT }} resizeMode="cover" />

            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  { position: "absolute", top: 0, left: 0, width: containerWidth, height: IMAGE_HEIGHT, opacity: opacityPercent / 100 },
                  animatedStyle,
                ]}
              >
                <Image source={{ uri: after.photoUrl }} style={{ width: containerWidth, height: IMAGE_HEIGHT }} resizeMode="cover" />
              </Animated.View>
            </GestureDetector>

            <View style={{ position: "absolute", bottom: 12, left: 12 }} className="rounded-full bg-black/60 px-3 py-1">
              <Text className="body-sm font-body-semibold text-brand-white">{formatDiaryDate(new Date(before.capturedAt))}</Text>
            </View>
            <View style={{ position: "absolute", bottom: 12, right: 12 }} className="rounded-full bg-black/60 px-3 py-1">
              <Text className="body-sm font-body-semibold text-brand-white">{formatDiaryDate(new Date(after.capturedAt))}</Text>
            </View>
            <Pressable
              onPress={resetPosition}
              hitSlop={8}
              style={{ position: "absolute", top: 12, right: 12 }}
              className="h-8 w-8 items-center justify-center rounded-full bg-black/60"
            >
              <Ionicons name="refresh" size={16} color={colors.brand.white} />
            </Pressable>
          </>
        )}
      </View>

      <View className="flex-row items-center gap-3 px-1">
        <Text className="body-sm text-text-secondary">Faded</Text>
        <View className="flex-1">
          <Slider value={opacityPercent} onValueChange={setOpacityPercent} minimumValue={0} maximumValue={100} />
        </View>
        <Text className="body-sm text-text-secondary">Solid</Text>
      </View>
      <Text className="caption text-center text-text-secondary">Drag the top photo to line it up — tap ↻ to reset.</Text>
    </View>
  );
}
