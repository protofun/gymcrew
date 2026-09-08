import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { dicebearAvatarUrl, randomAvatarSeeds } from "@/lib/avatar";
import { colors } from "@/theme";

// 10 fits without scrolling inside the sheet's own maxHeight — the previous 50 ran past the bottom
// of the sheet with no visible scroll affordance, reading as "the rest are just missing". Shuffle
// covers wanting to see more instead of showing them all at once.
const BATCH_SIZE = 10;
const THUMB_SIZE = 56;
/** Staggered per-thumbnail entrance, capped so item 50 doesn't wait nearly a second to appear. */
const MAX_STAGGER_MS = 240;

type AvatarPickerGridProps = {
  /** The seed currently being applied (shows a spinner over just that thumbnail) — null when idle.
   * Pass null always if the caller has no async apply step (e.g. picking a crew photo, which just
   * stores the URL directly with nothing to wait on). */
  applyingSeed: string | null;
  onPick: (seed: string) => void;
};

/** The DiceBear grid itself — 50 free, keyless avatar options with a shuffle button. Shared by the
 * personal AvatarGeneratorModal (uploads the pick to Clerk) and CrewAvatarGeneratorModal (stores the
 * pick's URL directly as the crew's icon) — same picker, different "what happens when you tap one." */
export function AvatarPickerGrid({ applyingSeed, onPick }: AvatarPickerGridProps) {
  const [batch, setBatch] = useState<string[]>(() => randomAvatarSeeds(BATCH_SIZE));
  const thumbnails = useMemo(() => batch.map((seed) => ({ seed, url: dicebearAvatarUrl(seed, 128) })), [batch]);

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => setBatch(randomAvatarSeeds(BATCH_SIZE))}
        disabled={applyingSeed !== null}
        className="flex-row items-center gap-1.5 self-end rounded-full border border-divider px-3 py-2"
      >
        <Ionicons name="shuffle" size={14} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-brand-yellow">Shuffle</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
        <View className="flex-row flex-wrap gap-2.5 pb-2">
          {thumbnails.map(({ seed, url }, index) => (
            <Animated.View key={seed} entering={FadeInUp.delay(Math.min(index * 15, MAX_STAGGER_MS)).springify().damping(14).mass(0.5)}>
              <Pressable
                onPress={() => onPick(seed)}
                disabled={applyingSeed !== null}
                style={({ pressed }) => ({ opacity: pressed || (applyingSeed !== null && applyingSeed !== seed) ? 0.5 : 1 })}
                className="items-center justify-center overflow-hidden rounded-full border border-divider bg-background"
              >
                <Image source={{ uri: url }} style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
                {applyingSeed === seed && (
                  <View className="absolute h-full w-full items-center justify-center bg-black/40">
                    <ActivityIndicator size="small" color={colors.brand.white} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
