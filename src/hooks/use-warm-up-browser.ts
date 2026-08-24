import { useEffect } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Required once, at module load, so Clerk's SSO flow (Google/Facebook/Apple) can hand control back
// to the app once the OAuth redirect lands on /sso-callback — on web this posts a message to the
// window that opened the auth popup so it can close itself and resume; on native it safely no-ops
// (there's no native implementation, and the module itself guards against calling it).
WebBrowser.maybeCompleteAuthSession();

/** Pre-warms the native in-app browser so the OAuth window opens instantly instead of with a
 * visible delay — call this in any screen with a "Sign in with Google/Facebook/Apple" button.
 * Native-only: `warmUpAsync`/`coolDownAsync` throw on web, where this is simply unnecessary since
 * the browser redirect flow works differently there. */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
