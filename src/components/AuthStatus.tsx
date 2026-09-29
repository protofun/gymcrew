import type { ReactNode } from "react";
import { Image, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import { images } from "@/constants/images";
import { colors, fontFamily, spring } from "@/theme";

type AuthStatusProps = {
  /** What's going on, or what went wrong. */
  message?: string;
  /** Show the pulsing dots — for "working on it", not for an error. */
  busy?: boolean;
  /** Buttons under the message, for a way out. */
  children?: ReactNode;
};

/** A full screen for the in-between moments of signing in — checking the session, waiting on a link, or
 * something that needs a retry. The mascot, a message, and pulsing dots while it works. */
export function AuthStatus({ message, busy = false, children }: AuthStatusProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.background }} className="items-center justify-center gap-5 px-8">
      <Animated.View entering={ZoomIn.springify().damping(spring.press.damping).mass(spring.press.mass)}>
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 150, height: 150 * (205 / 250) }} />
      </Animated.View>
      {busy ? <PulsingDots color={colors.brand.yellow} radius={5} spacing={20} /> : null}
      {message ? (
        <Animated.Text entering={FadeIn.delay(150)} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 22, color: colors.neutral.textSecondary, textAlign: "center" }}>
          {message}
        </Animated.Text>
      ) : null}
      {children ? <View className="w-full gap-3">{children}</View> : null}
    </View>
  );
}
