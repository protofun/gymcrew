import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Pressable as RNPressable,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type {
  PressableProviderProps,
  PressableContextType,
  PressableProps,
  AnimationConfig,
} from "./types";
// GymCrew patch: expo-blur isn't installed in this app at all (see AGENTS.md's note on the package
// not being part of the native build) — the vendored `blur` option rendered an `AnimatedBlurView`
// behind the content and its types.ts import failed to resolve outright, not just at the native
// build. Cut entirely (the whole `blur`/`defaultBlur` config, not just this usage) rather than
// worked around, since nothing in this app ever turned it on. Redo this patch if the component is
// ever re-added with `--overwrite`.

const PressableContext = createContext<PressableContextType | undefined>(
  undefined,
);

export const usePressableContext = (): PressableContextType => {
  const context = useContext(PressableContext);

  if (!context) {
    return {
      defaultLongPressDuration: 500,
    };
  }

  return context;
};

export const PressableProvider = React.memo<PressableProviderProps>(
  ({
    children,
    initialOnPress,
    defaultPressAnimation,
    defaultLongPressAnimation,
    defaultFeedback,
    disableAnimations = false,
    defaultLongPressDuration = 500,
  }) => {
    const contextValue = useMemo<PressableContextType>(
      () => ({
        initialOnPress,
        defaultPressAnimation,
        defaultLongPressAnimation,
        defaultFeedback,
        disableAnimations,
        defaultLongPressDuration,
      }),
      [
        initialOnPress,
        defaultPressAnimation,
        defaultLongPressAnimation,
        defaultFeedback,
        disableAnimations,
        defaultLongPressDuration,
      ],
    );

    return (
      <PressableContext.Provider value={contextValue}>
        {children}
      </PressableContext.Provider>
    );
  },
);

export const Pressable = React.memo<PressableProps>(
  ({
    children,
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    longPressDuration,
    disabled = false,
    style,
    pressAnimation,
    longPressAnimation,
    customAnimation,
    feedback,
    disableAnimations = false,
    skipGlobalCallback = false,
    testID,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole = "button",
    hitSlop,
  }) => {
    const context = usePressableContext();

    const isPressed = useSharedValue<boolean>(false);
    const isLongPressed = useSharedValue<boolean>(false);
    const progress = useSharedValue<number>(0);
    const longPressProgress = useSharedValue<number>(0);

    // GymCrew patch: `ReturnType<typeof setTimeout>`, not `NodeJS.Timeout` — this runs in RN/web,
    // where `setTimeout` returns a number-like handle, not Node's timer object; the vendored
    // `@types/node`-flavored type didn't actually match what's assigned to it below.
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const finalPressAnimation: AnimationConfig = {
      scale: 0.95,
      opacity: 1,
      rotate: 0,
      translateX: 0,
      translateY: 0,
      duration: 150,
      useSpring: false,
      damping: 10,
      stiffness: 100,

      ...context.defaultPressAnimation,
      ...pressAnimation,
    };

    const finalLongPressAnimation: AnimationConfig = {
      scale: 0.9,
      opacity: 0.8,
      rotate: 0,
      translateX: 0,
      translateY: 0,
      duration: 200,
      useSpring: true,
      damping: 8,
      stiffness: 80,
      ...context.defaultLongPressAnimation,
      ...longPressAnimation,
    };

    const finalFeedback = useMemo(
      () => ({
        haptic: false,
        hapticType: "light" as const,
        sound: false,
        ...context.defaultFeedback,
        ...feedback,
      }),
      [context.defaultFeedback, feedback],
    );

    const finalLongPressDuration =
      longPressDuration ?? context.defaultLongPressDuration ?? 500;
    const animationsDisabled = disableAnimations || context.disableAnimations;

    const triggerHaptic = useCallback(() => {
      if (finalFeedback.haptic && !disabled) {
        switch (finalFeedback.hapticType) {
          case "light":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case "medium":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case "heavy":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case "selection":
            Haptics.selectionAsync();
            break;
          case "success":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case "warning":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case "error":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        }
      }
    }, [finalFeedback.haptic, finalFeedback.hapticType, disabled]);

    const triggerSound = useCallback(() => {
      if (finalFeedback.sound && finalFeedback.onSound && !disabled) {
        finalFeedback.onSound();
      }
    }, [finalFeedback.sound, finalFeedback.onSound, disabled]);

    const animateValue = useCallback(
      (value: number, config: AnimationConfig) => {
        if (animationsDisabled) return value;

        if (config.useSpring) {
          return withSpring(value, {
            damping: config.damping,
            stiffness: config.stiffness,
          });
        }
        return withTiming(value, { duration: config.duration });
      },
      [animationsDisabled],
    );

    const handlePressIn = useCallback(
      (event: any) => {
        if (disabled) return;

        isPressed.value = true;
        progress.value = animateValue(1, finalPressAnimation);

        triggerHaptic();
        triggerSound();

        if (!skipGlobalCallback && context.initialOnPress) {
          context.initialOnPress(event);
        }

        if (onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            isLongPressed.value = true;
            longPressProgress.value = animateValue(1, finalLongPressAnimation);
            onLongPress(event);
          }, finalLongPressDuration);
        }

        onPressIn?.(event);
      },
      [
        disabled,
        isPressed,
        progress,
        triggerHaptic,
        triggerSound,
        skipGlobalCallback,
        context,
        onLongPress,
        finalLongPressDuration,
        onPressIn,
        animateValue,
        finalPressAnimation,
        finalLongPressAnimation,
      ],
    );

    const handlePressOut = useCallback(
      (event: any) => {
        if (disabled) return;

        isPressed.value = false;
        isLongPressed.value = false;
        progress.value = animateValue(0, finalPressAnimation);
        longPressProgress.value = animateValue(0, finalLongPressAnimation);

        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        onPressOut?.(event);
      },
      [
        disabled,
        isPressed,
        isLongPressed,
        progress,
        longPressProgress,
        onPressOut,
        animateValue,
        finalPressAnimation,
        finalLongPressAnimation,
      ],
    );

    const handlePress = useCallback(
      (event: any) => {
        if (disabled) return;
        onPress?.(event);
      },
      [disabled, onPress],
    );

    useEffect(() => {
      return () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
      };
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
      if (customAnimation) {
        return customAnimation(progress, isPressed);
      }

      const activeAnimation = isLongPressed.value
        ? finalLongPressAnimation
        : finalPressAnimation;
      const activeProgress = isLongPressed.value
        ? longPressProgress.value
        : progress.value;

      const scale = interpolate(
        activeProgress,
        [0, 1],
        [1, activeAnimation.scale ?? 1],
      );

      const rotate = interpolate(
        activeProgress,
        [0, 1],
        [0, activeAnimation.rotate ?? 0],
      );

      const opacity = interpolate(
        activeProgress,
        [0, 1],
        [1, activeAnimation.opacity ?? 1],
      );

      const translateX = interpolate(
        activeProgress,
        [0, 1],
        [0, activeAnimation.translateX ?? 0],
      );

      const translateY = interpolate(
        activeProgress,
        [0, 1],
        [0, activeAnimation.translateY ?? 0],
      );

      return {
        transform: [
          { scale },
          { rotate: `${rotate}deg` },
          { translateX },
          { translateY },
        ],
        opacity,
      } as any;
    }, [customAnimation, finalPressAnimation, finalLongPressAnimation]);

    const content = useMemo(
      () => (
        <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
      ),
      [style, animatedStyle, children],
    );

    // `blur` is never enabled in this app (see the patch note by the removed expo-blur import
    // above) — no blur wrapper to render around `content`.
    const wrappedContent = useMemo(() => {
      return content;
    }, [content]);

    return (
      <RNPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        hitSlop={hitSlop}
        style={style}
      >
        {wrappedContent}
      </RNPressable>
    );
  },
);
