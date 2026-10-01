import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  /** GymCrew house style — the same skewed-italic look `SkewedStat`'s static numbers already use
   * (body-log.tsx's weight readout, ChallengeCard/NewPrsBanner's titles, TopBar's wordmark), applied
   * here to the outer wrapper only (not `row`, which is reused per-digit-column below it too — a
   * transform on that would skew each column separately and throw digits out of alignment with each
   * other). One skew on the whole rendered block reads as one skewed number, matching every other
   * skewed number in the app rather than inventing a second "how numbers look" language. */
  skewed: {
    transform: [{ skewX: "-8deg" }],
  },
  digit: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  numberCell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
