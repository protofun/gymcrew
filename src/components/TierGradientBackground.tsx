import { useRef, useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { darken, lighten } from "@/lib/color";

let gradientIdCounter = 0;

/** A vivid radial glow that stays within `color`'s own hue the whole way — a lighter tint at the
 * center fading to a darker shade of the SAME color at the edges, never down to transparent/the
 * app's neutral background (which reads as a different, unrelated blue-black and just looks like
 * the color "ran out" rather than like a considered light-to-dark treatment of one color). This is
 * the "this card belongs to this rank tier" surface used on PR/session share cards and the PR
 * celebration screen. Measures its own rendered size (`onLayout`) and draws the gradient in real
 * pixels (`userSpaceOnUse`, radius keyed off the larger of width/height) rather than SVG's
 * percentage/`objectBoundingBox` units — those visibly under-covered the narrower dimension on a
 * card whose width and height differ a lot (looked like the glow was "cut off" at the sides). Each
 * instance needs its own gradient id (SVG `url(#id)` refs are looked up by id in the real DOM on
 * web, so two instances sharing one id would collide). */
type TierGradientBackgroundProps = {
  color: string;
  children: ReactNode;
  /** False for full-screen usage (e.g. pr-celebration.tsx) where this isn't a floating card and
   * shouldn't have its own corner radius/border. Defaults to true (the card treatment). */
  rounded?: boolean;
};

export function TierGradientBackground({ color, children, rounded = true }: TierGradientBackgroundProps) {
  const idRef = useRef<string | undefined>(undefined);
  if (!idRef.current) idRef.current = `tier-glow-${gradientIdCounter++}`;
  const gradientId = idRef.current;

  const [size, setSize] = useState({ width: 0, height: 0 });

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  // A tighter radius than "cover everything evenly" — keeps the glow concentrated near the top
  // (like a spotlight on the medal) and lets the corners/bottom go noticeably darker, which reads
  // as a considered, premium gradient rather than a flat, uniformly-saturated color wash.
  const radius = Math.max(size.width, size.height) * 0.72;

  return (
    <View
      // `flex-1` deliberately comes through className, not a sibling `style` prop — this project's
      // NativeWind version doesn't reliably compile some properties when a style prop is mixed onto
      // the same element as a className (see the many other "inline-only" comments in this repo);
      // here it silently dropped `flex: 1`, so the full-screen (rounded=false) case measured only
      // its own un-stretched content height instead of the whole screen — the gradient then visibly
      // "cut off" partway down (see pr-celebration.tsx).
      className={`overflow-hidden bg-background ${rounded ? "rounded-3xl border border-divider" : "flex-1"}`}
      onLayout={handleLayout}
    >
      {size.width > 0 && size.height > 0 && (
        // Explicit pixel `width`/`height` props, not just `StyleSheet.absoluteFillObject`'s
        // position/inset styling — react-native-svg's web output renders a real `<svg>` tag, which
        // (like `<img>`) keeps its own intrinsic default size (300×150) unless given real
        // width/height; the surrounding absolute-position styling alone doesn't stretch it, which
        // showed up as the gradient rendering in only the top-left 300×150px and then hard-cutting
        // off instead of covering the whole card/screen.
        <Svg width={size.width} height={size.height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
          <Defs>
            <RadialGradient id={gradientId} cx={size.width / 2} cy={0} r={radius} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={lighten(color, 0.22)} stopOpacity={1} />
              <Stop offset="40%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={darken(color, 0.8)} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
