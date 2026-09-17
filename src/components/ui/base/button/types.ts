import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

interface IButtonContext {
  readonly progress: SharedValue<number>;
  readonly isLoading: boolean;
  readonly disabled: boolean;
}

interface IButtonRoot {
  children?: ReactNode;
  readonly isLoading?: boolean;
  readonly onPress?: () => void;
  readonly width?: number;
  readonly height?: number;
  readonly backgroundColor?: string;
  readonly loadingBackgroundColor?: string;
  readonly borderRadius?: number;
  readonly gradientColors?: string[];
  readonly withPressAnimation?: boolean;
  readonly animationDuration?: number;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
  /** Stretches to fill the parent instead of the default intrinsic (`width`/`height`-prop) sizing
   * — GymCrew's own buttons are full-width edge-to-edge within their padded container, unlike this
   * primitive's upstream default. Not part of the original Reacticx API. */
  readonly fullWidth?: boolean;
  /** Extra style applied to the outer `Pressable` itself (e.g. `{ flex: 1 }` to grow inside a
   * `flex-row` sibling layout) — `fullWidth` only toggles `alignSelf`, which controls the *cross*
   * axis, not main-axis growth; this covers cases `fullWidth` can't. Not part of the original
   * Reacticx API. */
  readonly containerStyle?: StyleProp<ViewStyle>;
}

interface IButtonContent {
  children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

interface IButtonLoading {
  children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

interface IButtonIndicator {
  children?: ReactNode;
  readonly color?: string;
  readonly size?: "small" | "large";
  readonly style?: StyleProp<ViewStyle>;
}

interface IButtonLabel {
  children?: ReactNode;
  readonly color?: string;
  readonly size?: number;
  readonly style?: StyleProp<TextStyle>;
}

export type {
  IButtonContext,
  IButtonRoot,
  IButtonContent,
  IButtonLoading,
  IButtonIndicator,
  IButtonLabel,
};
