import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { goBack } from "@/lib/navigation";
import { CrewAvatarGeneratorModal } from "@/components/CrewAvatarGeneratorModal";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { images } from "@/constants/images";
import { CREW_ICONS } from "@/data/crew-icons";
import { CREW_TRAINING_TYPES } from "@/data/crew-training-types";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spring } from "@/theme";

export default function CreateCrewScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const [crewName, setCrewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [trainingType, setTrainingType] = useState<string>(CREW_TRAINING_TYPES[0]);
  const [icon, setIcon] = useState(CREW_ICONS[0].key);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const isGeneratedIcon = !CREW_ICONS.some((item) => item.key === icon);

  function handleCreate() {
    const trimmedName = crewName.trim();
    if (!trimmedName) {
      setNameError("Enter a crew name.");
      return;
    }
    setNameError(null);
    setCrewData({ choice: "create", crewName: trimmedName, trainingType, icon });
    router.push({ pathname: "/build-crew/crew-settings", params: { crewName: trimmedName } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => goBack()}
          hitSlop={8}
          className="mb-2 h-9 w-9 items-center justify-center rounded-full border border-divider"
        >
          <Ionicons name="chevron-back" size={20} color={colors.neutral.textPrimary} />
        </Pressable>

        <View className="items-center gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
            className="font-body-bold text-3xl text-center text-text-primary"
          >
            Create Your Crew
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
            className="font-body-medium text-lg text-center text-text-secondary"
          >
            Set up your crew and{"\n"}invite your friends.
          </Animated.Text>
        </View>

        <Animated.View
          entering={ZoomIn.delay(150).springify().damping(spring.press.damping).mass(spring.press.mass)}
          className="items-center py-6"
        >
          <Image source={images.mascotteCrossedArms} style={{ width: 220, height: 220 }} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(220).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
          className="gap-5"
        >
          <View className="gap-2">
            <Text className="body-md text-text-primary">Crew Name</Text>
            <TextInput
              value={crewName}
              onChangeText={(text) => {
                setCrewName(text);
                setNameError(null);
              }}
              placeholder="Enter crew name"
              placeholderTextColor={colors.neutral.textSecondary}
              className={`rounded-xl border bg-surface px-4 py-4 body-md text-text-primary ${
                nameError ? "border-error" : "border-divider"
              }`}
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            {nameError && <Text className="body-sm text-error">{nameError}</Text>}
          </View>

          <SearchableSelectField
            label="Training Type"
            value={trainingType}
            options={CREW_TRAINING_TYPES}
            onChange={setTrainingType}
          />

          <View className="gap-2">
            <Text className="body-md text-text-primary">Crew Icon</Text>
            <View className="flex-row flex-wrap gap-3">
              {CREW_ICONS.map((item) => {
                const active = item.key === icon;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setIcon(item.key)}
                    className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                      active ? "border-brand-yellow" : "border-divider"
                    }`}
                  >
                    <CrewIconBadge iconKey={item.key} size={60} tint={active ? colors.brand.yellow : colors.neutral.textPrimary} />
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setGeneratorOpen(true)}
                className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                  isGeneratedIcon ? "border-brand-yellow" : "border-dashed border-divider"
                }`}
              >
                {isGeneratedIcon ? (
                  <CrewIconBadge iconKey={icon} size={60} />
                ) : (
                  <Ionicons name="sparkles-outline" size={22} color={colors.neutral.textSecondary} />
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <View className="mt-8">
          <OnboardingFooter label="Create Crew" activeIndex={4} dotCount={5} onPress={handleCreate} />
        </View>
      </ScrollView>

      <CrewAvatarGeneratorModal visible={generatorOpen} onClose={() => setGeneratorOpen(false)} onPick={setIcon} />
    </SafeAreaView>
  );
}
