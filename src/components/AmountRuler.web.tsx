import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import type { AmountRulerProps } from "@/components/AmountRuler";
import { colors } from "@/theme";

const TICK_SPACING = 12;

/** Web version of AmountRuler — the same ticks, as a snapping horizontal scroller instead of a Skia canvas. */
export function AmountRuler({ value, min, max, unitStep, onChange, resetKey }: AmountRulerProps) {
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const ticks = Math.max(1, Math.round((max - min) / unitStep)) + 1;

  useEffect(() => {
    if (width > 0) scrollRef.current?.scrollTo({ x: Math.round((value - min) / unitStep) * TICK_SPACING, animated: false });
    // Only when the ruler is laid out or moved from outside — not on every change while dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, resetKey]);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: 64 }}>
      {width > 0 && (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_SPACING}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={(event) => {
              const tick = Math.round(event.nativeEvent.contentOffset.x / TICK_SPACING);
              onChange(Math.min(max, Math.max(min, min + tick * unitStep)));
            }}
            contentContainerStyle={{ paddingHorizontal: width / 2 - 1, alignItems: "center" }}
          >
            {Array.from({ length: ticks }, (_, index) => (
              <View key={index} style={{ width: TICK_SPACING, alignItems: "center" }}>
                <View style={{ width: 2, height: index % 5 === 0 ? 34 : 20, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.35)" }} />
              </View>
            ))}
          </ScrollView>
          <View pointerEvents="none" style={{ position: "absolute", left: width / 2 - 1.5, top: 12, width: 3, height: 40, borderRadius: 2, backgroundColor: colors.brand.yellow }} />
        </>
      )}
    </View>
  );
}
