import * as Sharing from "expo-sharing";
import { toBlob } from "html-to-image";
import type { RefObject } from "react";
import { Platform, Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

/** Loose shape for the bits of the Web Share API TypeScript's DOM lib doesn't fully type yet
 * (file sharing is Level 2 — `canShare`/`share({ files })` support varies by browser). */
type WebShareNavigator = Navigator & {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
};

function shareAsText(message: string) {
  // Share.share returns a rejected promise on web when the browser has no native share sheet
  // (e.g. non-HTTPS or headless contexts) — .catch() it so that never surfaces as an unhandled
  // rejection (a plain try/catch around the call wouldn't catch an async rejection like this).
  Share.share({ message }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
}

/** Captures `ref`'s view as a real image and shares/downloads it — native via `react-native-view-
 * shot` + `expo-sharing`, web via `html-to-image` (view-shot has no web implementation at all).
 * Extracted from `ShareCardModal` once a second and third caller (`pr-celebration.tsx`, `whats-my-
 * rank.tsx`) needed the exact same native+web capture logic — both of those used to just fall back
 * to a text-only share on web unconditionally, never actually sharing a picture there ("als ik share
 * moet er een foto worden geshared"), the same gap `ShareCardModal`'s own web path already had one
 * real fix for; this is that fix, reused instead of re-solved. Falls back to `fallbackMessage` as a
 * plain text share if the capture fails for any reason. Returns whether an actual image was shared
 * (vs. the text fallback), so a caller can gate its own analytics/success state on that. */
export async function shareViewAsImage({
  ref,
  fileName,
  fallbackMessage,
  dialogTitle,
}: {
  ref: RefObject<View | null>;
  fileName: string;
  fallbackMessage: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (!ref.current) {
    shareAsText(fallbackMessage);
    return false;
  }

  if (Platform.OS === "web") {
    try {
      // A beat for anything still settling on screen, so the picture is the finished card.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const node = ref.current as unknown as HTMLElement;
      // `toBlob` serializes the node into a fresh SVG image, which does NOT inherit the page's
      // already-loaded fonts unless they're embedded (`getFontEmbedCSS`, the default) — skipping
      // that would be faster but silently swaps any custom heading font for a fallback, visibly
      // breaking layout. A hard timeout instead, so a genuinely stuck fetch still falls back to
      // text rather than leaving the caller's own loading state spinning forever.
      const blob = await Promise.race([
        toBlob(node, { pixelRatio: 2, cacheBust: true }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Share image capture timed out")), 8000)),
      ]);
      if (!blob) throw new Error("toBlob returned nothing");

      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as WebShareNavigator;
      if (nav.share && nav.canShare?.({ files: [file] })) {
        // No timeout here, deliberately — this hands off to the real OS share sheet, a user-driven
        // interaction that can legitimately take a while; it resolves or rejects on its own once
        // they act, same as any `Share.share` call already does natively.
        await nav.share({ files: [file], text: fallbackMessage });
        return true;
      }

      // No file-sharing support (most desktop browsers never expose it) — downloading the actual
      // picture still gets the user the photo, which a text-only share never would.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.warn("Failed to capture share image on web, falling back to text share", error);
      shareAsText(fallbackMessage);
      return false;
    }
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile" });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle });
    } else {
      await Share.share({ url: uri });
    }
    return true;
  } catch (error) {
    console.warn("Failed to capture share image, falling back to text share", error);
    shareAsText(fallbackMessage);
    return false;
  }
}
