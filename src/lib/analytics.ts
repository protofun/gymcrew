import { getClerkInstance } from "@clerk/expo";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const isApiConfigured = API_BASE_URL.length > 0;

// Same "inactivity ends the session" convention most analytics tools use — a new session starts
// once the app has been idle (backgrounded or just untouched) for longer than this.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function newSessionId(): string {
  return `session-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

let sessionId = newSessionId();
let lastEventAt = Date.now();

function currentSessionId(): string {
  const now = Date.now();
  if (now - lastEventAt > SESSION_TIMEOUT_MS) {
    sessionId = newSessionId();
  }
  lastEventAt = now;
  return sessionId;
}

/** Computed once at module load — device category doesn't change mid-session. `standalone` is how
 * a PWA install is detected after the fact (no reliable "is this installed" API exists — this is
 * the closest: true means the app is currently running in its own installed window, not a browser
 * tab), and drives the admin panel's PWA-adoption numbers together with the explicit
 * "pwa_installed"/"pwa_opened" events fired from _layout.tsx's PwaTracker. */
function detectPlatform(): { platform: string; standalone: boolean } {
  if (Platform.OS !== "web") {
    return { platform: Platform.OS, standalone: false };
  }
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { platform: "web", standalone: false };
  }
  const standalone =
    (window.matchMedia?.("(display-mode: standalone)").matches ?? false) ||
    // iOS Safari's own non-standard "added to home screen" flag — matchMedia alone misses this one.
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  // Split by OS (not just mobile/desktop) so the admin panel's PWA Adoption section can report
  // real iOS vs. Android install counts, not just "mobile".
  let platform = "web-desktop";
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) platform = "ios";
  else if (/Android/i.test(navigator.userAgent)) platform = "android";
  return { platform, standalone };
}

const deviceInfo = detectPlatform();

function send(eventType: string, screenName?: string, properties?: Record<string, unknown>): void {
  if (!isApiConfigured) return;

  // Fire-and-forget: never awaited by callers, never throws — a flaky network must never affect
  // the UI. This is our own first-party pipe into the backend (see backend/routes/track.php,
  // dispatched as "/activity" — not "/track", since ad blockers routinely block any URL
  // containing "track" as a generic analytics heuristic, which would silently drop this data for
  // a meaningful share of real users), feeding the admin panel's own Analytics page and the User
  // Detail "Behavior" tab. Every posthog.capture() call in the app also lands here automatically
  // — see the capture() patch in config/posthog.ts — so this file itself is only called directly
  // for screen views (below) and events that have no PostHog equivalent (e.g. pwa_installed).
  void (async () => {
    try {
      const token = await getClerkInstance().session?.getToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventType,
          sessionId: currentSessionId(),
          screenName,
          properties: { ...properties, platform: deviceInfo.platform, standalone: deviceInfo.standalone },
        }),
      });
    } catch {
      // Telemetry is best-effort.
    }
  })();
}

/** Records a named in-app action (e.g. "pwa_installed") — most events already reach here
 * automatically via the posthog.capture() patch in config/posthog.ts; call this directly only for
 * events with no PostHog equivalent. */
export function trackEvent(eventType: string, properties?: Record<string, unknown>): void {
  send(eventType, undefined, properties);
}

/** Records a screen view. */
export function trackScreen(screenName: string, properties?: Record<string, unknown>): void {
  send("screen_view", screenName, properties);
}
