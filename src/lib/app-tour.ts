import type { SpotlightTour } from "react-native-spotlight-tour";

/** Module-singleton handle to the running app tour (see components/AppTourOverlay.tsx). The tour
 * lives inside (tabs)/_layout.tsx, but the admin-only "Open Tutorial Wizard" button that replays it
 * sits on profile/account.tsx — a different route in the stack — so it needs a way to reach the
 * tour without prop-drilling or round-tripping through a store. */
export const appTourRef: { current: SpotlightTour | null } = { current: null };
