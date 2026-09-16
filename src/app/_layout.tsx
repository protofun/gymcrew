import "../../global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppToast } from "@/components/AppToast";
import { DivisionCelebrationWatcher } from "@/components/DivisionCelebrationWatcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppFonts } from "@/hooks/use-app-fonts";
import { trackEvent, trackScreen } from "@/lib/analytics";
import { posthog } from "@/config/posthog";
import "@/config/sentry";
import { colors } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env.local file");
}

// Without this, the navigator's own background (visible at the edges whenever a screen doesn't
// perfectly cover the viewport — e.g. on web, around safe-area insets) defaults to React
// Navigation's light theme background (#f2f2f2), showing as a pale bar above/below the app.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.neutral.background,
    card: colors.neutral.background,
    text: colors.neutral.textPrimary,
    border: colors.neutral.divider,
    primary: colors.brand.yellow,
  },
};

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
      trackScreen(pathname, { previousScreen: previousPathname.current ?? null });
      previousPathname.current = pathname;
    }
  }, [pathname, params, posthogClient]);

  return null;
}

/** Web-only PWA install/open tracking (see the "PWA Analytics" admin section). `matchMedia
 * (display-mode: standalone)` on mount tells us this launch is already running as an installed
 * app; the `appinstalled` event fires the moment a user completes an install from the browser's
 * own prompt. Both feed trackEvent, not posthog.capture — this has no PostHog equivalent. */
function PwaTracker() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      trackEvent("pwa_opened");
    }

    function handleInstalled() {
      trackEvent("pwa_installed");
    }
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
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
              <PwaTracker />
              <StatusBar style="light" />
              <ThemeProvider value={navTheme}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.neutral.background },
                  }}
                />
              </ThemeProvider>
              <DivisionCelebrationWatcher />
              <AppToast />
            </PostHogProvider>
          </ClerkProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
