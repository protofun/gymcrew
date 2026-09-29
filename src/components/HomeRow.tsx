import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

/** One row of Home's flowing "today" list — full width, a hairline underneath, no box around it. Every row in the list shares this
 * same shape, so they read as one connected list instead of a row of unevenly-sized cards. */
export function HomeRow({ onPress, children }: { onPress?: () => void; children: ReactNode }) {
  const body = <View className="gap-3 border-b border-divider py-4">{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {body}
    </Pressable>
  );
}
