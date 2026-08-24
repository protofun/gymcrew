import { useAuth } from "@clerk/expo";
import { Stack } from "expo-router";

// Deliberately no "if signed in, redirect away" here anymore — that used to live at this shared
// layout level, but it made /sign-up silently skip account creation and reuse whatever session was
// already active (e.g. a developer's own test account) instead of ever showing the form. Sign-in
// and sign-up now each handle an already-active session themselves, in the way that's actually
// correct for that screen — see sign-in.tsx / sign-up.tsx.
export default function AuthLayout() {
  const { isLoaded } = useAuth();

  if (!isLoaded) return null;

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
