import { useState } from "react";
import { Image, Text, View, type LayoutChangeEvent } from "react-native";

import { Slider } from "@/components/Slider";
import { formatDiaryDate } from "@/lib/date";

const IMAGE_HEIGHT = 420;

type PhotoRef = { photoUrl: string; capturedAt: number };

type Props = {
  before: PhotoRef;
  after: PhotoRef;
};

/**
 * Classic before/after reveal slider: `after` sits clipped on top of `before`, and dragging the
 * slider grows/shrinks how much of `after` shows. Makes gradual physique change visible in a single
 * glance instead of relying on flipping between two photos and remembering what changed.
 */
export function ProgressPhotoOverlay({ before, after }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [revealPercent, setRevealPercent] = useState(50);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  const revealWidth = (containerWidth * revealPercent) / 100;

  return (
    <View className="gap-3">
      <View
        onLayout={handleLayout}
        style={{ height: IMAGE_HEIGHT }}
        className="w-full overflow-hidden rounded-2xl bg-surface"
      >
        {containerWidth > 0 && (
          <>
            <Image source={{ uri: before.photoUrl }} style={{ width: containerWidth, height: IMAGE_HEIGHT }} resizeMode="cover" />
            <View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: revealWidth, overflow: "hidden" }}>
              <Image source={{ uri: after.photoUrl }} style={{ width: containerWidth, height: IMAGE_HEIGHT }} resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", top: 0, bottom: 0, left: revealWidth - 1, width: 2 }} className="bg-brand-yellow" />

            <View style={{ position: "absolute", bottom: 12, left: 12 }} className="rounded-full bg-black/60 px-3 py-1">
              <Text className="body-sm font-body-semibold text-brand-white">{formatDiaryDate(new Date(before.capturedAt))}</Text>
            </View>
            <View style={{ position: "absolute", bottom: 12, right: 12 }} className="rounded-full bg-black/60 px-3 py-1">
              <Text className="body-sm font-body-semibold text-brand-white">{formatDiaryDate(new Date(after.capturedAt))}</Text>
            </View>
          </>
        )}
      </View>

      <View className="flex-row items-center gap-3 px-1">
        <Text className="body-sm text-text-secondary">Before</Text>
        <View className="flex-1">
          <Slider value={revealPercent} onValueChange={setRevealPercent} minimumValue={0} maximumValue={100} />
        </View>
        <Text className="body-sm text-text-secondary">After</Text>
      </View>
    </View>
  );
}
