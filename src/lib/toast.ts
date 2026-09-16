import Toast from "react-native-toast-message";

import type { ToastVariant } from "@/components/AppToast";

/** Shows the app's single, on-brand toast overlay (rendered once via `<AppToast />` in
 * `_layout.tsx`) — use this instead of importing `react-native-toast-message` directly so every
 * toast in the app goes through the same styled variants. */
export function showToast(variant: ToastVariant, text1: string, text2?: string): void {
  Toast.show({ type: variant, text1, text2 });
}
