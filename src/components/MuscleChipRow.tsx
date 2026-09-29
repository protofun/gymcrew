import { Image, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { muscleGroupImages } from "@/constants/images";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/data/workout-log";
import { colors, fontFamily, spring } from "@/theme";

const CHIP_SIZE = 34;

/** A muscle group as a small illustrated circle with its name underneath — the same "circle, then a label" shape the goal rings
 * and every Home row's leading visual use, instead of a row of bordered text pills (which reads as a generic tag list). Used for
 * "also lagging" muscles and for what today's plan trains. */
export function MuscleChipRow({ groups }: { groups: MuscleGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-3">
      {groups.map((group, index) => (
        <Animated.View key={group} entering={FadeInDown.delay(index * 60).springify().damping(spring.entrance.damping).mass(spring.entrance.mass)} className="items-center gap-1" style={{ width: 56 }}>
          <View style={{ width: CHIP_SIZE, height: CHIP_SIZE, borderRadius: CHIP_SIZE / 2, backgroundColor: colors.neutral.surface }} className="items-center justify-center overflow-hidden">
            <Image source={muscleGroupImages[group]} resizeMode="contain" style={{ width: 26, height: 26 }} />
          </View>
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.neutral.textSecondary, textAlign: "center" }} numberOfLines={1}>
            {formatMuscleLabel(group)}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
