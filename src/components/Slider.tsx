import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";

const THUMB_SIZE = 22;

type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
};

export function Slider({ value, onValueChange, minimumValue, maximumValue, step = 1 }: SliderProps) {
  const trackRef = useRef<View>(null);
  const trackPageX = useRef(0);
  const trackWidth = useRef(0);

  function valueFromPageX(pageX: number) {
    if (trackWidth.current <= 0) return value;
    const ratio = Math.min(1, Math.max(0, (pageX - trackPageX.current) / trackWidth.current));
    const raw = minimumValue + ratio * (maximumValue - minimumValue);
    const stepped = Math.round(raw / step) * step;
    return Math.min(maximumValue, Math.max(minimumValue, stepped));
  }

  function measureTrack() {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackWidth.current = width;
      trackPageX.current = pageX;
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        measureTrack();
        onValueChange(valueFromPageX(event.nativeEvent.pageX));
      },
      onPanResponderMove: (event) => onValueChange(valueFromPageX(event.nativeEvent.pageX)),
    }),
  ).current;

  const [renderedWidth, setRenderedWidth] = useState(0);
  const ratio = maximumValue > minimumValue ? (value - minimumValue) / (maximumValue - minimumValue) : 0;
  const thumbX = ratio * renderedWidth;

  return (
    <View
      ref={trackRef}
      className="justify-center py-3"
      onLayout={(event) => {
        setRenderedWidth(event.nativeEvent.layout.width);
        measureTrack();
      }}
      {...panResponder.panHandlers}
    >
      <View className="h-1.5 w-full rounded-full bg-divider" />
      <View className="absolute h-1.5 rounded-full bg-brand-yellow" style={{ width: thumbX }} />
      <View
        className="absolute rounded-full bg-brand-yellow"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          left: Math.max(0, Math.min(renderedWidth - THUMB_SIZE, thumbX - THUMB_SIZE / 2)),
        }}
      />
    </View>
  );
}
