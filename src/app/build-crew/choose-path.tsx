import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { type ImageSourcePropType, Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type PathKey = "join" | "create" | "later";

const MASCOT_WIDTH = 148;

const PATHS: {
  key: PathKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  mascot: { source: ImageSourcePropType; aspectRatio: number };
}[] = [
  {
    key: "join",
    icon: "people",
    title: "Join a Crew",
    description: "Find your friends or discover awesome crews.",
    mascot: { source: images.mascotsCrew, aspectRatio: 520 / 420 },
  },
  {
    key: "create",
    icon: "add",
    title: "Create a Crew",
    description: "Build your own crew and invite your friends.",
    mascot: { source: images.mascotteLaptop, aspectRatio: 904 / 762 },
  },
  {
    key: "later",
    icon: "time-outline",
    title: "Maybe Later",
    description: "Skip for now and do it later.",
    mascot: { source: images.mascotteCrew, aspectRatio: 426 / 394 },
  },
];

export default function ChoosePathScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const [selected, setSelected] = useState<PathKey>("join");

  function handleContinue() {
    setCrewData({ choice: selected });
    if (selected === "join") router.push("/build-crew/join");
    else if (selected === "create") router.push("/build-crew/create");
    else {
      completeCrewSelection();
      router.replace("/home");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <View className="items-center gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-3xl text-center text-text-primary"
          >
            Choose Your Path
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-medium text-lg text-center text-text-secondary"
          >
            What do you want to do?
          </Animated.Text>
        </View>

        <View className="flex-1 justify-center gap-4">
          {PATHS.map((path, index) => {
            const active = path.key === selected;
            return (
              <Animated.View
                key={path.key}
                entering={FadeInUp.delay(150 + index * 80)
                  .springify()
                  .damping(14)
                  .mass(0.6)}
              >
                <Pressable
                  onPress={() => setSelected(path.key)}
                  className={`overflow-hidden rounded-2xl border bg-surface ${
                    active ? "border-brand-yellow" : "border-divider"
                  }`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, position: "relative" })}
                >
                  <View className={`p-5 ${active ? "pr-40" : ""}`}>
                    <View className="gap-3">
                      {active ? (
                        <Ionicons name={path.icon} size={28} color={colors.brand.yellow} />
                      ) : (
                        <View className="h-11 w-11 items-center justify-center rounded-full border border-divider">
                          <Ionicons name={path.icon} size={20} color={colors.neutral.textPrimary} />
                        </View>
                      )}
                      <View className="gap-1">
                        <Text className="heading-4 text-text-primary">{path.title}</Text>
                        <Text className="body-md text-text-secondary">{path.description}</Text>
                      </View>
                    </View>
                  </View>

                  {active && (
                    <Animated.Image
                      entering={FadeIn.duration(220)}
                      exiting={FadeOut.duration(120)}
                      source={path.mascot.source}
                      style={{
                        position: "absolute",
                        right: 4,
                        bottom: 0,
                        width: MASCOT_WIDTH,
                        height: MASCOT_WIDTH / path.mascot.aspectRatio,
                      }}
                      resizeMode="contain"
                    />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <OnboardingFooter
          label="Continue"
          activeIndex={2}
          dotCount={5}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
