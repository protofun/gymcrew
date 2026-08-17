import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { colors } from "@/theme";

export default function WorkoutLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        contentStyle: { backgroundColor: colors.neutral.background },
      }}
    >
      {/* A slower fade instead of the usual slide-up — this is a celebration moment, not just
          another form screen, so it should feel like a distinct, deliberate reveal. */}
      <Stack.Screen
        name="pr-celebration"
        options={{ animation: "fade", animationDuration: 500, contentStyle: { backgroundColor: "#000000" } }}
      />
    </Stack>
  );
}
