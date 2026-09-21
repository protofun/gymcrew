import * as Clipboard from "expo-clipboard";
import { router, type Href } from "expo-router";
import { Linking } from "react-native";

import { showToast } from "@/lib/toast";

/** Opens a banner button's link: a screen inside the app ("/profile/subscription") or a web page.
 * The backend only ever stores those two shapes (see backend/routes/banners.php). */
export function openBannerLink(url: string): void {
  if (url.startsWith("/")) router.push(url as Href);
  else Linking.openURL(url).catch(() => showToast("error", "Couldn't open the link"));
}

export async function copyPromoCode(code: string): Promise<void> {
  await Clipboard.setStringAsync(code);
  showToast("success", "Code copied", code);
}

/** "Ends in 2d 4h" / "Ends in 5h" / "Ends in 40m" for a deal's countdown line — null once it's over. */
export function formatTimeLeft(endsAt: number, now = Date.now()): string | null {
  const minutes = Math.floor((endsAt - now) / 60000);
  if (minutes <= 0) return null;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h`;
  return `Ends in ${minutes}m`;
}
