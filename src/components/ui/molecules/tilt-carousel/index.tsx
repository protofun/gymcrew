import * as React from "react";
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import type { ICarousel, ICarouselItem } from "./types";
// GymCrew patch: expo-blur isn't installed in this app at all (see AGENTS.md) — `useBlur` defaults
// to false and nothing in this app turns it on, so the whole blur overlay path is cut rather than
// worked around. Redo this patch if the component is ever re-added with `--overwrite`.

const CarouselItem = <T,>({
  item,
  index,
  scrollX,
  renderItem,
  itemWidth,
  itemHeight,
  marginHorizontal,
  fullWidth,
  rotationAngle,
  translateYValue,
  transformOrigin,
  useBlur,
}: ICarouselItem<T>):
  | (React.ReactNode & React.JSX.Element & React.ReactNode)
  | null => {
  const animatedStyle = useAnimatedStyle<Pick<ViewStyle, "transform">>(() => {
    const rotateZ = interpolate(
      scrollX.value,
      [(index - 1) * fullWidth, index * fullWidth, (index + 1) * fullWidth],
      [rotationAngle, 0, -rotationAngle],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      [(index - 1) * fullWidth, index * fullWidth, (index + 1) * fullWidth],
      [translateYValue, 0, translateYValue],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotateZ: `${rotateZ}deg` }, { translateY: translateY }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        {
          width: itemWidth,
          height: itemHeight,
          marginHorizontal: marginHorizontal,
          transformOrigin:
            Platform.OS === "android"
              ? `${itemWidth / 2}px ${itemHeight}px`
              : transformOrigin,
        },
        animatedStyle,
      ]}
    >
      {renderItem({
        item,
        index,
        scrollX,
        itemWidth,
        itemHeight,
        marginHorizontal,
        fullWidth,
      })}
    </Animated.View>
  );
};

export const TiltCarousel = <T,>({
  data,
  renderItem,
  itemWidth = 250,
  itemHeight = 400,
  marginHorizontal = 20,
  rotationAngle = 20,
  translateYValue = 60,
  transformOrigin = "bottom",
  useBlur = false,
  keyExtractor,
  scrollEventThrottle = 16,
  decelerationRate = "fast",
  showsHorizontalScrollIndicator = false,
}: ICarousel<T>):
  | (React.ReactNode & React.JSX.Element & React.ReactNode)
  | null => {
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue<number>(0);

  const fullWidth = itemWidth + marginHorizontal * 2;
  const spacerWidth = (width - fullWidth) / 2;

  const onScroll = useAnimatedScrollHandler<Record<string, unknown>>({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.FlatList
      onScroll={onScroll}
      ListHeaderComponent={<View />}
      ListHeaderComponentStyle={{ width: spacerWidth }}
      ListFooterComponent={<View />}
      contentContainerStyle={{
        alignItems: "center",
        marginTop: 40,
        marginBottom: 40,
      }}
      ListFooterComponentStyle={{ width: spacerWidth }}
      data={data}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      style={{ flexGrow: 0 }}
      keyExtractor={
        keyExtractor
          ? (item, index) => keyExtractor(item, index)
          : (_, index) => index.toString()
      }
      renderItem={({
        item,
        index,
      }): React.JSX.Element & React.ReactNode & React.ReactElement => {
        return (
          <CarouselItem
            item={item}
            index={index}
            scrollX={scrollX}
            renderItem={renderItem}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
            marginHorizontal={marginHorizontal}
            fullWidth={fullWidth}
            rotationAngle={rotationAngle}
            translateYValue={translateYValue}
            transformOrigin={transformOrigin}
            useBlur={useBlur}
          />
        );
      }}
      horizontal
      scrollEventThrottle={scrollEventThrottle}
      decelerationRate={decelerationRate}
      snapToInterval={fullWidth}
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  blurOverlay: {
    borderRadius: 12,
  },
});
