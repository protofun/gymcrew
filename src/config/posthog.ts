import PostHog from "posthog-react-native";
import Constants from "expo-constants";

import { trackEvent } from "@/lib/analytics";

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

// Mirrors every posthog.capture() call — all ~90 existing call sites across the app, present and
// future, no per-call-site changes needed — into our own first-party analytics_events table (see
// lib/analytics.ts, backend/routes/track.php). This is the one place that needs to know about both
// systems; everywhere else in the app keeps calling posthog.capture() exactly as before. Patched
// here (once, at the shared client instance) rather than duplicating each call site, per the "reuse
// existing instrumentation, don't build a second one" goal for the admin panel's own analytics.
const originalCapture = posthog.capture.bind(posthog);
posthog.capture = ((event, properties, options) => {
  trackEvent(event, properties as Record<string, unknown> | undefined);
  return originalCapture(event, properties, options);
}) as typeof posthog.capture;
