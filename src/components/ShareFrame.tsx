import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when combined with a className.
const wordmarkStyle = { fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 28, fontStyle: "italic" as const, transform: [{ skewX: "-10deg" }] };

/** The poster everything shared from the app sits on — plain background, the wordmark on top, a tagline at the bottom. What is
 * captured as the picture is this whole frame, so it is solid all the way to the edges (no see-through corners that turn black in a chat)
 * and made only of static pieces: nothing in it is mid-animation when the picture is taken. */
export function ShareFrame({ children }: { children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.neutral.background }} className="items-center gap-5 px-6 pb-6 pt-7">
      <Text style={wordmarkStyle}>
        <Text style={{ color: colors.neutral.textPrimary }}>GYM</Text>
        <Text style={{ color: colors.brand.yellow }}>CREW</Text>
      </Text>
      {children}
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 2, color: colors.neutral.textSecondary }}>TRACK IT. RANK IT. GYMCREW.</Text>
    </View>
  );
}
