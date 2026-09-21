import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Marquee } from "@/components/ui/base/marquee";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { fontFamily } from "@/theme";

/** A slowly scrolling strip of short phrases (Reacticx `marquee`) — the AI results use it for what was
 * recognised, Progress for the week's headline numbers. Pure atmosphere that also says something. */
export function TextTicker({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <View style={{ height: 34, borderColor: AI_SCAN.border, overflow: "hidden", justifyContent: "center" }} className="border-y">
      <Marquee speed={30} spacing={0}>
        <View className="flex-row items-center">
          {items.map((name, index) => (
            <View key={`${name}-${index}`} className="flex-row items-center">
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 1.2, color: AI_SCAN.textMuted }}>{name.toUpperCase()}</Text>
              <Ionicons name="sparkles" size={11} color={AI_SCAN.accent} style={{ marginHorizontal: 14 }} />
            </View>
          ))}
        </View>
      </Marquee>
    </View>
  );
}
