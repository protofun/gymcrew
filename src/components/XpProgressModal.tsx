import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { SegmentedBar } from "@/components/SegmentedBar";
import { images } from "@/constants/images";
import { colors, fontFamily } from "@/theme";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MASCOT_WIDTH = 168;
const MASCOT_ASPECT_RATIO = 250 / 205;

function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

type XpProgressModalProps = {
  visible: boolean;
  onClose: () => void;
  streakDays: number;
  xp: number;
  xpToNextLevel: number;
  crewPoints: number;
  crewPointsGoal: number;
  trainedDays: boolean[];
};

export function XpProgressModal({
  visible,
  onClose,
  streakDays,
  xp,
  xpToNextLevel,
  crewPoints,
  crewPointsGoal,
  trainedDays,
}: XpProgressModalProps) {
  const today = todayIndex();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-5 rounded-3xl border border-divider bg-surface p-5"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="gap-4 rounded-2xl bg-background p-4">
            <Image
              source={images.mascotFlexing}
              resizeMode="contain"
              style={{
                position: "absolute",
                top: -14,
                right: -12,
                width: MASCOT_WIDTH,
                height: MASCOT_WIDTH / MASCOT_ASPECT_RATIO,
              }}
            />

            <View style={{ maxWidth: "58%" }} className="gap-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flame" size={16} color={colors.semantic.streak} />
                <Text className="caption text-text-secondary">Streak</Text>
              </View>

              <Text
                style={{ fontFamily: fontFamily.heading, fontSize: 52, lineHeight: 52 }}
                className="text-text-primary"
              >
                {streakDays}
              </Text>

              <Text className="caption text-text-secondary">Days in a row</Text>
            </View>

            <View className="overflow-hidden rounded-xl">
              <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(13,17,23,0.82)" }} />
              <View className="flex-row justify-between px-2.5 py-2.5">
                {WEEKDAY_LABELS.map((label, index) => {
                  const trained = trainedDays[index] ?? false;
                  const isToday = index === today;

                  return (
                    <View key={label} className="items-center gap-1.5">
                      <Text className={`caption ${isToday ? "text-brand-yellow" : "text-text-secondary"}`}>
                        {label}
                      </Text>
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-full border ${
                          trained
                            ? "border-brand-yellow bg-brand-yellow"
                            : isToday
                              ? "border-brand-yellow bg-surface"
                              : "border-divider bg-surface"
                        }`}
                      >
                        {trained && <Ionicons name="checkmark" size={16} color={colors.brand.iron} />}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="body-md font-body-semibold text-text-primary">XP</Text>
                  <Text className="caption text-text-secondary">
                    {xp.toLocaleString("en-US")} / {xpToNextLevel.toLocaleString("en-US")}
                  </Text>
                </View>
                <SegmentedBar ratio={xpToNextLevel > 0 ? xp / xpToNextLevel : 0} color={colors.brand.yellow} />
              </View>

              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="body-md font-body-semibold text-text-primary">Crew Points</Text>
                  <Text className="caption text-text-secondary">
                    {crewPoints.toLocaleString("en-US")} / {crewPointsGoal.toLocaleString("en-US")}
                  </Text>
                </View>
                <SegmentedBar ratio={crewPointsGoal > 0 ? crewPoints / crewPointsGoal : 0} color={colors.semantic.success} />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
