import "../../global.css";

import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useEffect, useRef } from "react";
import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { useAppFonts } from "@/hooks/use-app-fonts";
import { posthog } from "@/config/posthog";
import { colors } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env.local file");
}

SplashScreen.preventAutoHideAsync();

/** Syncs the authenticated Clerk user to PostHog for accurate identification. */
function PostHogUserSync() {
  const { user, isSignedIn } = useUser();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (isSignedIn && user) {
      posthogClient.identify(user.id, {
        $set: { clerk_id: user.id },
      });
    } else if (!isSignedIn) {
      posthogClient.reset();
    }
  }, [isSignedIn, user, posthogClient]);

  return null;
}

/** Tracks every screen change in Expo Router as a PostHog screen event. */
function PostHogScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const posthogClient = usePostHog();

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthogClient.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params, posthogClient]);

  return null;
}

export default function RootLayout() {
  const { loaded, error } = useAppFonts();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false, // Manual screen tracking via PostHogScreenTracker
          captureTouches: true,
          propsToCapture: ["testID"],
          maxElementsCaptured: 20,
        }}
      >
        <PostHogUserSync />
        <PostHogScreenTracker />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.neutral.background },
          }}
        />
      </PostHogProvider>
    </ClerkProvider>
  );
}
