import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import { FoodThumbnail } from "@/components/FoodThumbnail";
import type { ApiFoodLog } from "@/lib/api";
import { colors, fontFamily } from "@/theme";

type DiaryRecentProps = {
  entries: ApiFoodLog[];
  photoByFoodId: Record<string, string | undefined>;
  onAdd: (entry: ApiFoodLog) => void;
  /** Section title, all caps (default "AGAIN?"). */
  title?: string;
};

/** "Again?" — a strip of what you logged most recently; one tap logs it again (the diary, and the Add Food hub as "Recently added"). */
export function DiaryRecent({ entries, photoByFoodId, onAdd, title = "AGAIN?" }: DiaryRecentProps) {
  if (entries.length === 0) return null;

  return (
    <View className="gap-3">
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginHorizontal: -16 }} contentInset={{ left: 16 }}>
        <View style={{ width: 4 }} />
        {entries.map((entry, index) => (
          <Animated.View key={entry.foodId ?? entry.id} entering={FadeInRight.delay(index * 70).springify().damping(16)}>
            <Pressable onPress={() => onAdd(entry)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, width: 112 })} className="gap-2" accessibilityLabel={`Log ${entry.name} again`}>
              <View>
                <FoodThumbnail photoUrl={entry.foodId ? photoByFoodId[entry.foodId] : undefined} icon="fast-food" color={colors.brand.yellow} size={112} />
                <View style={{ backgroundColor: colors.brand.yellow }} className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full">
                  <Ionicons name="add" size={20} color={colors.brand.iron} />
                </View>
              </View>
              <View className="gap-0.5">
                <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.brand.white }}>
                  {entry.name}
                </Text>
                <Text className="caption text-text-secondary">{`${Math.round(entry.calories)} kcal · ${entry.quantity}${entry.unit}`}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
