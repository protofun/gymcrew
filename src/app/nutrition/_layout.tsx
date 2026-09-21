import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { colors } from "@/theme";

export default function NutritionLayout() {
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
      {/* Moving between the four hub pages (see NutritionNavBar) is a fade, not a slide over the previous one. */}
      <Stack.Screen name="my-foods" options={{ animation: "fade" }} />
      <Stack.Screen name="progress" options={{ animation: "fade" }} />
      <Stack.Screen name="history" options={{ animation: "fade" }} />
    </Stack>
  );
}
