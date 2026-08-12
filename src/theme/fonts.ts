/**
 * Font family registration for the GymCrew design system.
 * Passed to `useFonts` (see `src/hooks/use-app-fonts.ts`) and mirrored
 * as `--font-*` CSS variables in `global.css`.
 *
 * Bebas Neue only ships one weight, so it is used for display/heading
 * text only. Poppins covers body text and needs a matching font family
 * loaded per weight, since React Native does not synthesize bold/medium
 * weights for custom fonts.
 */
export const fontFamily = {
  heading: "BebasNeue-Regular",
  bodyRegular: "Poppins-Regular",
  bodyMedium: "Poppins-Medium",
  bodySemiBold: "Poppins-SemiBold",
  bodyBold: "Poppins-Bold",
} as const;

export const fontAssets = {
  [fontFamily.heading]: require("../../assets/fonts/BebasNeue-Regular.ttf"),
  [fontFamily.bodyRegular]: require("../../assets/fonts/Poppins-Regular.ttf"),
  [fontFamily.bodyMedium]: require("../../assets/fonts/Poppins-Medium.ttf"),
  [fontFamily.bodySemiBold]: require("../../assets/fonts/Poppins-SemiBold.ttf"),
  [fontFamily.bodyBold]: require("../../assets/fonts/Poppins-Bold.ttf"),
};
