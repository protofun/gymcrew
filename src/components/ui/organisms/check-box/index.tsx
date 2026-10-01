// @ts-check
import React, { memo, useEffect, useRef } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  G,
  Path,
  Svg,
  // @ts-check
  type PathProps,
  type GProps,
} from "react-native-svg";
import type { ICheckbox, IStrokePath } from "./types";
import { BOX_PATH, BOX_PATH_LENGTH, PADDING, TICK_PATH, TICK_PATH_LENGTH, VIEWPORT_SIZE } from "./conf";

const AnimatedSvgPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// GymCrew patch: `length` is now a precomputed constant (see `conf.ts`'s own comment) instead of
// measured at runtime via `onLayout` — the original approach relied on react-native-svg's web
// `<Path>` firing `onLayout`, which it never does at all (confirmed: a real "Unknown event handler
// property onLayout" console warning), so `pathLength` stayed 0 forever and the whole checkbox
// rendered fully transparent on web, permanently. A fixed path never needs a measured length.
const StrokePath: React.FC<IStrokePath> = ({
  animValue,
  length,
  ...pathProps
}: IStrokePath): React.ReactNode & React.JSX.Element => {
  const animatedStrokeProps = useAnimatedProps<
    Pick<PathProps, "strokeDashoffset" | "opacity">
  >(() => {
    const easedProgress = Easing.bezierFn(0.37, 0, 0.63, 1)(animValue.value);
    const offset = length - length * easedProgress;

    return {
      strokeDashoffset: Math.max(0, offset),
      opacity: 1,
    };
  });

  return (
    <AnimatedSvgPath
      strokeDasharray={length}
      animatedProps={animatedStrokeProps}
      {...pathProps}
    />
  );
};

export const Checkbox: React.FC<ICheckbox> = memo(
  ({
    checked = false,
    checkmarkColor,
    stroke = 1.5,
    size,
    showBorder = false,
  }: ICheckbox) => {
    const animValue = useSharedValue<number>(checked ? 1 : 0);
    const borderAnimValue = useSharedValue<number>(showBorder ? 1 : 0);
    const scaleValue = useSharedValue<number>(1);
    const isFirstRender = useRef<boolean>(true);

    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        animValue.value = checked ? 1 : 0;
        borderAnimValue.value = showBorder ? 1 : 0;
        scaleValue.value = 1;
        return;
      }

      animValue.value = withTiming<number>(checked ? 1 : 0, {
        duration: checked ? 300 : 250,
        easing: checked
          ? Easing.bezier(0.4, 0, 0.2, 1)
          : Easing.bezier(0.4, 0, 0.6, 1),
      });

      if (checked) {
        scaleValue.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
          mass: 0.5,
        });
      } else {
        scaleValue.value = withTiming(1, { duration: 100 });
      }
    }, [checked, animValue, scaleValue]);

    useEffect(() => {
      if (isFirstRender.current) return;

      borderAnimValue.value = withTiming(showBorder ? 1 : 0, {
        duration: 250,
        easing: showBorder
          ? Easing.bezier(0.4, 0, 0.2, 1)
          : Easing.bezier(0.4, 0, 0.6, 1),
      });
    }, [showBorder, borderAnimValue]);

    // GymCrew patch: the RN-style array transform (5 entries — translate/scale/translate, composing
    // "scale around point (32,32)") only applied its LAST two entries on web via `useAnimatedProps`
    // on a `<G>` — confirmed by reading the rendered element's actual `transform` attribute, which
    // came out as `translate(-32, -32) scale(1)`, dropping the leading `translate(32, 32)` and the
    // real `scale` value entirely. That silently mispositioned the checkmark a few px outside the
    // box (and dropped its pop-in scale), reading as "no checkmark" — confirmed by inspecting the
    // tick path's real `getBoundingClientRect()`, not guessed. A single pre-composed SVG transform
    // STRING (what the underlying DOM attribute actually is) sidesteps whatever in the array-to-
    // attribute conversion drops entries on web; native's own `<G>` transform composition wasn't
    // touched. Redo if the component is ever re-added with `--overwrite`.
    const animatedCheckmarkProps = useAnimatedProps<Pick<GProps, "transform">>(
      () => {
        const scale = interpolate(scaleValue.value, [0, 1], [0.8, 1]);

        return {
          transform: `translate(32, 32) scale(${scale}) translate(-32, -32)` as unknown as GProps["transform"],
        };
      },
    );

    const viewBox = [
      -PADDING,
      -PADDING,
      VIEWPORT_SIZE + PADDING,
      VIEWPORT_SIZE + PADDING,
    ].join(" ");

    return (
      <Svg width={size} height={size} viewBox={viewBox}>
        <StrokePath
          d={BOX_PATH}
          length={BOX_PATH_LENGTH}
          stroke={checkmarkColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          animValue={borderAnimValue}
        />
        <AnimatedG animatedProps={animatedCheckmarkProps}>
          <StrokePath
            d={TICK_PATH}
            length={TICK_PATH_LENGTH}
            stroke={checkmarkColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            animValue={animValue}
          />
        </AnimatedG>
      </Svg>
    );
  },
);

export default memo<React.FC<ICheckbox>>(Checkbox);
