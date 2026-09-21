import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { useWaterLogStore } from "@/store/water-log-store";
import { colors, fontFamily } from "@/theme";

const GLASS_ML = 250;
const DAILY_GOAL_ML = 2000;
const GLASSES = DAILY_GOAL_ML / GLASS_ML;

/** One glass: an outline that fills with water — with a little pop — when it's been drunk. */
function Glass({ filled }: { filled: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    fill.value = withSpring(filled ? 1 : 0, { damping: 14, stiffness: 180 });
    if (filled) pop.value = withSequence(withSpring(1.3, { damping: 6, stiffness: 300 }), withSpring(1, { damping: 12, stiffness: 200 }));
  }, [filled, fill, pop]);

  const filledStyle = useAnimatedStyle(() => ({ opacity: fill.value, transform: [{ scale: pop.value }] }));

  return (
    <View style={{ width: 30, height: 34 }} className="items-center justify-center">
      <Ionicons name="water-outline" size={28} color={colors.neutral.textSecondary} />
      <Animated.View style={[{ position: "absolute" }, filledStyle]}>
        <Ionicons name="water" size={28} color={colors.semantic.info} />
      </Animated.View>
    </View>
  );
}

/** Water as a row of eight glasses that fill up — tap "+ glass" to log 250 ml, the minus takes the
 * last one back. Same store and same "undo the most recent tap" model as before, just with something
 * to watch instead of a bar. */
export function DiaryWater({ dateKey }: { dateKey: string }) {
  const posthog = usePostHog();
  const allEntries = useWaterLogStore((state) => state.entries);
  const addEntry = useWaterLogStore((state) => state.addEntry);
  const removeLast = useWaterLogStore((state) => state.removeLast);

  const entries = useMemo(() => allEntries.filter((entry) => entry.dateKey === dateKey), [allEntries, dateKey]);
  const totalMl = entries.reduce((sum, entry) => sum + entry.amountMl, 0);
  const filledGlasses = Math.floor(totalMl / GLASS_ML);

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 0.8, color: colors.brand.white }}>WATER</Text>
        <View className="flex-row items-baseline gap-1">
          <NumberFlow value={totalMl / 1000} decimals={1} fontSize={18} color={colors.semantic.info} fontWeight="800" />
          <Text className="caption font-body-semibold text-text-secondary">{`/ ${(DAILY_GOAL_ML / 1000).toFixed(1)} L`}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row justify-between">
          {Array.from({ length: GLASSES }, (_, index) => (
            <Glass key={index} filled={index < filledGlasses} />
          ))}
        </View>
        <View className="ml-3 flex-row items-center gap-2">
          {entries.length > 0 && (
            <Pressable
              onPress={() => {
                removeLast(dateKey);
                posthog.capture("water_log_undone");
              }}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full border border-divider"
              accessibilityLabel="Undo last glass"
            >
              <Ionicons name="remove" size={16} color={colors.neutral.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              addEntry(GLASS_ML, dateKey);
              posthog.capture("water_logged", { amount_ml: GLASS_ML });
            }}
            className="h-9 flex-row items-center gap-1 rounded-full px-3.5"
            style={{ backgroundColor: `${colors.semantic.info}26` }}
            accessibilityLabel="Add a glass of water"
          >
            <Ionicons name="add" size={15} color={colors.semantic.info} />
            <Text className="caption font-body-bold" style={{ color: colors.semantic.info }}>
              glass
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
