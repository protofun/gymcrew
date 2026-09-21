import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Marquee } from "@/components/ui/base/marquee";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { fontFamily } from "@/theme";

/** A slowly scrolling strip of everything the AI found (Reacticx `marquee`) — pure atmosphere that
 * also confirms at a glance what was recognised. */
export function AiScanIngredientTicker({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <View style={{ height: 34, borderColor: AI_SCAN.border, overflow: "hidden", justifyContent: "center" }} className="border-y">
      <Marquee speed={30} spacing={0}>
        <View className="flex-row items-center">
          {names.map((name, index) => (
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
