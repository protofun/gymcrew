import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/theme";

type GoalRingProps = {
  ratio: number;
  color: string;
  size: number;
  strokeWidth?: number;
  children?: ReactNode;
};

/** A circular progress ring (Apple Fitness / Whoop style) with arbitrary content centered inside it. */
export function GoalRing({ ratio, color, size, strokeWidth = 4, children }: GoalRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.neutral.divider} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}
