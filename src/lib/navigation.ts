import { router } from "expo-router";

/**
 * Goes back if there's real navigation history to go back to, otherwise replaces with `fallback`.
 * A bare `router.back()` silently does nothing when there's nothing to go back to — most commonly
 * a hard refresh (or opening a deep link) that lands directly on a screen with an empty history
 * stack. On the web that's a minor annoyance (the browser's own back button still works); on the
 * installed PWA there is no browser chrome at all, so a no-op back button strands the user on that
 * screen with no way out. Use this for every back button instead of calling `router.back()` directly.
 */
export function goBack(fallback: Parameters<typeof router.replace>[0] = "/home"): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
