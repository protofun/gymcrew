import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const DEFAULT_HEIGHT = 7;

type ProgressBarProps = {
  ratio: number;
  color: string;
  height?: number;
};

export function ProgressBar({ ratio, color, height = DEFAULT_HEIGHT }: ProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(trackWidth * Math.min(1, Math.max(0, ratio)), { duration: 700 });
  }, [ratio, trackWidth, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  return (
    <View
      className="w-full rounded-full bg-divider"
      style={{ height }}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ height, borderRadius: 999, backgroundColor: color }, fillStyle]} />
    </View>
  );
}
