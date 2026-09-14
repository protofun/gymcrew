import * as Sentry from "@sentry/react-native";

// DSNs are meant to be embedded client-side (they're not secret — see Sentry's own docs), so this
// reads straight from EXPO_PUBLIC_SENTRY_DSN like the other EXPO_PUBLIC_* vars in this project,
// no app.config.js `extra` indirection needed. Unset in dev/local builds until a real Sentry
// project exists — initializing with an empty DSN makes the SDK a no-op instead of throwing, so
// every Sentry.* call elsewhere (see components/ErrorBoundary.tsx) is always safe to make.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryConfigured = !!dsn;

Sentry.init({
  dsn,
  enabled: isSentryConfigured,
  // Cheap to leave on: only sends anything when a real DSN is configured above.
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

export { Sentry };
