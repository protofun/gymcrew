import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { AuthField } from "@/components/AuthField";
import { CrewAvatarGeneratorModal } from "@/components/CrewAvatarGeneratorModal";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { FieldLabel, OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RingChoice } from "@/components/RingChoice";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { CREW_ICONS } from "@/data/crew-icons";
import { CREW_TRAINING_TYPES } from "@/data/crew-training-types";
import { crewProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily, spring } from "@/theme";

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
    <>
      <OnboardingScreen
        progress={crewProgress("join-or-create")}
        title="Create Your Crew"
        subtitle="Set up your crew and invite your friends."
        hero={
          <View className="items-center gap-2">
            <Animated.View key={icon} entering={ZoomIn.springify().damping(spring.press.damping).mass(spring.press.mass)}>
              <CrewIconBadge iconKey={icon} size={112} />
            </Animated.View>
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, letterSpacing: 1, color: crewName.trim() ? colors.brand.white : colors.neutral.textSecondary }}>{(crewName.trim() || "Your crew").toUpperCase()}</Text>
          </View>
        }
        footer={<PrimaryButton label="Create Crew" onPress={handleCreate} />}
      >
        <AuthField
          label="Crew name"
          placeholders={["Iron Legion", "Sunday Squad", "The Deadlifters"]}
          value={crewName}
          error={nameError}
          onChangeText={(text) => {
            setCrewName(text);
            setNameError(null);
          }}
        />

        <SearchableSelectField variant="wizard" label="Training Type" value={trainingType} options={CREW_TRAINING_TYPES} onChange={setTrainingType} />

        <View className="gap-3">
          <FieldLabel>Crew icon</FieldLabel>
          <View className="flex-row flex-wrap gap-3">
            {CREW_ICONS.map((item) => (
              <RingChoice key={item.key} selected={item.key === icon} onPress={() => setIcon(item.key)}>
                <CrewIconBadge iconKey={item.key} size={60} tint={item.key === icon ? colors.brand.yellow : colors.neutral.textPrimary} />
              </RingChoice>
            ))}
            <RingChoice selected={isGeneratedIcon} onPress={() => setGeneratorOpen(true)}>
              {isGeneratedIcon ? <CrewIconBadge iconKey={icon} size={60} /> : <Ionicons name="sparkles-outline" size={22} color={colors.neutral.textSecondary} />}
            </RingChoice>
          </View>
        </View>
      </OnboardingScreen>

      <CrewAvatarGeneratorModal visible={generatorOpen} onClose={() => setGeneratorOpen(false)} onPick={setIcon} />
    </>
  );
}
