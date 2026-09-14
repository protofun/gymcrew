import { Stack } from "expo-router";

// Reachable both signed-out (linked from sign-up.tsx, before an account exists) and signed-in
// (linked from profile/account.tsx) — unlike (auth)/_layout.tsx and (tabs)/_layout.tsx, there's
// deliberately no auth gate here.
export default function LegalLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
