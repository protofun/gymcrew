import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { colors } from "@/theme";

export default function RanksDetailLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.neutral.background },
      }}
    />
  );
}
