import type { ImageSourcePropType } from "react-native";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { ScaleCarousel } from "@/components/ui/molecules/scale-carousel";
import { colors, fontFamily } from "@/theme";

export type Shortcut = { id: string; title: string; hint: string; cta: string; image: ImageSourcePropType; onPress: () => void };

const HEIGHT = 176;

/** The Add Food shortcuts (My Meals, My Foods, ...) as pages you swipe through (Reacticx `scale-carousel`):
 * the app's own illustration on the right swells and tilts as it slides in, the name and one line of help on the left. */
export function AddFoodShortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  const { width } = useWindowDimensions();

  return (
    <View style={{ height: HEIGHT, marginHorizontal: -16 }}>
      <ScaleCarousel
        data={shortcuts}
        keyExtractor={(item) => item.id}
        itemWidth={width}
        itemHeight={HEIGHT}
        spacing={16}
        scaleRange={[1.3, 1, 1.3]}
        rotationRange={[10, 0, -8]}
        renderItem={({ item }) => (
          <Pressable onPress={item.onPress} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "center", paddingLeft: 20 }} accessibilityLabel={item.title}>
            <View style={{ maxWidth: "58%" }} className="gap-1.5">
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 34, lineHeight: 36, letterSpacing: 1, color: colors.brand.white }}>{item.title.toUpperCase()}</Text>
              <Text className="caption text-text-secondary">{item.hint}</Text>
              <View className="mt-2 self-start rounded-full bg-brand-yellow px-4 py-2">
                <Text className="caption font-body-bold text-brand-iron">{item.cta}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

