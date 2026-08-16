import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { type ImageSourcePropType, Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { images } from "@/constants/images";
import { CREW_TRAINING_TYPES } from "@/data/crew-training-types";
import { EXISTING_CREWS } from "@/data/crews";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type CrewIcon =
  | { key: string; type: "image"; source: ImageSourcePropType }
  | { key: string; type: "icon"; name: keyof typeof MaterialCommunityIcons.glyphMap };

// The animal icons are cropped from the app's own commissioned mascot art,
// so they match the brand style exactly. The "cat-*" icons come from
// robohash.org's set4 (a free, no-key avatar generator) for extra variety —
// they're a different, cartoonier art style than the mascots since we don't
// have a generator that produces custom art in the app's own style.
const CREW_ICONS: CrewIcon[] = [
  { key: "gorilla", type: "image", source: images.iconGorilla },
  { key: "tiger", type: "image", source: images.iconTiger },
  { key: "elephant", type: "image", source: images.iconElephant },
  { key: "dumbbell", type: "icon", name: "dumbbell" },
  { key: "cat-yellow", type: "image", source: images.iconGenCatYellow },
  { key: "cat-pink", type: "image", source: images.iconGenCatPink },
  { key: "cat-green", type: "image", source: images.iconGenCatGreen },
  { key: "cat-red", type: "image", source: images.iconGenCatRed },
  { key: "cat-brown", type: "image", source: images.iconGenCatBrown },
  { key: "cat-coral", type: "image", source: images.iconGenCatCoral },
];

export default function CreateCrewScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const [crewName, setCrewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [trainingType, setTrainingType] = useState<string>(CREW_TRAINING_TYPES[0]);
  const [icon, setIcon] = useState(CREW_ICONS[0].key);

  function handleCreate() {
    const trimmedName = crewName.trim();
    if (!trimmedName) {
      setNameError("Enter a crew name.");
      return;
    }
    const nameTaken = EXISTING_CREWS.some((crew) => crew.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameTaken) {
      setNameError("This crew name is already taken.");
      return;
    }
    setNameError(null);
    setCrewData({ choice: "create", crewName: trimmedName, trainingType, icon });
    router.push({ pathname: "/build-crew/crew-settings", params: { crewName: trimmedName } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-3xl text-center text-text-primary"
          >
            Create Your Crew
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-medium text-lg text-center text-text-secondary"
          >
            Set up your crew and{"\n"}invite your friends.
          </Animated.Text>
        </View>

        <Animated.View
          entering={ZoomIn.delay(150).springify().damping(11).mass(0.7)}
          className="items-center py-6"
        >
          <Image source={images.mascotteCrossedArms} style={{ width: 220, height: 220 }} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(220).springify().damping(14).mass(0.6)}
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
                    className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-surface ${
                      active ? "border-brand-yellow" : "border-divider"
                    }`}
                  >
                    {item.type === "image" ? (
                      <Image source={item.source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : (
                      <MaterialCommunityIcons
                        name={item.name}
                        size={26}
                        color={active ? colors.brand.yellow : colors.neutral.textPrimary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <View className="mt-8">
          <OnboardingFooter label="Create Crew" activeIndex={4} dotCount={5} onPress={handleCreate} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
