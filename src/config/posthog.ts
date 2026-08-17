import PostHog from "posthog-react-native";
import Constants from "expo-constants";

// Configuration loaded from app.config.js extras via expo-constants.
// Environment variables (POSTHOG_PROJECT_TOKEN, POSTHOG_HOST) are read at
// build time in app.config.js and embedded into the app bundle.
const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as
  | string
  | undefined;
const host =
  (Constants.expoConfig?.extra?.posthogHost as string) ||
  "https://us.i.posthog.com";

const isPostHogConfigured =
  !!projectToken && projectToken !== "phc_your_project_token_here";

if (__DEV__) {
  if (!isPostHogConfigured) {
    console.error(
      "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, " +
        "this causes events to be silently missed. " +
        "This error stops appearing once POSTHOG_PROJECT_TOKEN is configured.",
    );
  }
}

/**
 * PostHog client instance for GymCrew.
 *
 * Required peer dependencies already in this project:
 *   expo-constants, expo-device, @react-native-async-storage/async-storage,
 *   react-native-svg
 *
 * @see https://posthog.com/docs/libraries/react-native
 */
export const posthog = new PostHog(projectToken || "placeholder_key", {
  host,

  // Disable PostHog when no token is configured so the app never crashes.
  disabled: !isPostHogConfigured,

  // Capture app lifecycle events (Application Opened, Backgrounded, etc.)
  captureAppLifecycleEvents: true,

  // Batching – optimise for battery life on mobile
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,

  // Feature flags
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,

  // Network
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

export const isPostHogEnabled = isPostHogConfigured;
