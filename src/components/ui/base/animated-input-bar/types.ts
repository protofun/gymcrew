import type {
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from "react-native";

interface IAnimatedInput extends Omit<TextInputProps, "placeholder"> {
  placeholders: string[];
  readonly animationInterval?: number;
  /** GymCrew: where the animated placeholder starts, from the left edge (default 18) — set it to match the padding you give the input. */
  readonly placeholderLeft?: number;
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly inputWrapperStyle?: StyleProp<ViewStyle>;
  readonly inputStyle?: StyleProp<TextStyle>;
  readonly placeholderStyle?: StyleProp<TextStyle>;
  readonly characterEnterDuration?: number;
  readonly characterExitDuration?: number;
  readonly characterDelayIncrement?: number;
}

interface ICharacter {
  char: string;
  index: number;
  enterDuration: number;
  exitDuration: number;
  delayIncrement: number;
  style?: TextStyle;
}

export type { IAnimatedInput, ICharacter };
