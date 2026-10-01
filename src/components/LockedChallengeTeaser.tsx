import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ScrollView, Text, View } from "react-native";

import type { ChallengeMetric } from "@/data/challenges";
import { challengeHeroImage } from "@/lib/challenge-visuals";
import { colors, fontFamily } from "@/theme";

const CARD_WIDTH = 156;
const CARD_HEIGHT = 190;

type TeaserItem = { id: string; name: string; metric: ChallengeMetric };

/** A real "coming soon" teaser, not the old dimmed `ChallengeCard` row with a tiny lock pill and a
 * frozen 0% bar — "dat slotje met tekst moet heel anders worden getoond en beter." A horizontal
 * scroll strip (the same shape `DiaryRecent`'s own horizontal cards already use on Nutrition) of
 * full-bleed hero images, each with a dark gradient scrim and a real centered lock badge instead of
 * a small icon buried in a text row, so a locked challenge reads as "something's coming" rather than
 * "a broken challenge that can't be tapped." */
export function LockedChallengeTeaser({ items }: { items: TeaserItem[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
      {items.map((item) => (
        <View key={item.id} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, overflow: "hidden" }}>
          <Image source={challengeHeroImage(item.metric)} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.55 }} />
          <LinearGradient
            colors={["transparent", "rgba(13,17,23,0.55)", "rgba(13,17,23,0.96)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
          />
          <View style={{ position: "absolute", top: 14, left: 14 }}>
            <View
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(13,17,23,0.7)" }}
              className="items-center justify-center"
            >
              <Ionicons name="lock-closed" size={17} color={colors.brand.yellow} />
            </View>
          </View>
          <View style={{ position: "absolute", left: 14, right: 14, bottom: 14 }} className="gap-1">
            <Text
              style={{ fontFamily: fontFamily.heading, fontSize: 16, lineHeight: 18, color: colors.brand.white }}
              numberOfLines={2}
            >
              {item.name.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.neutral.textSecondary }}>Unlocks at release</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
