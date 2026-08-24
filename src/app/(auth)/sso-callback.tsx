import { useEffect } from "react";
import { ActivityIndicator, SafeAreaView } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { colors } from "@/theme";

/**
 * Where Clerk's SSO flow (Google/Facebook/Apple) redirects after the OAuth provider hands control
 * back — `useSSO`'s `startSSOFlow` defaults to `AuthSession.makeRedirectUri({ path: "sso-callback" })`
 * when no explicit `redirectUrl` is passed (see sign-in.tsx / sign-up.tsx), so this route has to
 * exist even though it renders almost nothing: on web it's the popup window that briefly loads,
 * calls `maybeCompleteAuthSession()` to signal the original tab, then closes itself. Without this
 * route the redirect has nowhere to land and shows a 404 instead.
 */
export default function SSOCallbackScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.neutral.background }}>
      <ActivityIndicator size="large" color={colors.brand.yellow} />
    </SafeAreaView>
  );
}
