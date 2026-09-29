import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SelectTile } from "@/components/SelectTile";
import { images } from "@/constants/images";
import { crewProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { spring } from "@/theme";

type PathKey = "join" | "create" | "later";

const PATHS = [
  { key: "join", title: "Join a Crew", description: "Find your friends or discover awesome crews.", image: images.mascotsCrew },
  { key: "create", title: "Create a Crew", description: "Build your own crew and invite your friends.", image: images.mascotteLaptop },
  { key: "later", title: "Maybe Later", description: "Skip for now and do it later.", image: images.mascotteCrew },
] as const;

export default function ChoosePathScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const [selected, setSelected] = useState<PathKey>("join");
  const posthog = usePostHog();

  function handleContinue() {
    setCrewData({ choice: selected });
    posthog.capture("crew_path_chosen", { choice: selected });
    if (selected === "join") router.push("/build-crew/join");
    else if (selected === "create") router.push("/build-crew/create");
    else {
      completeCrewSelection();
      router.replace("/home");
    }
  }

  return (
    <OnboardingScreen progress={crewProgress("choose-path")} title="Choose Your Path" subtitle="What do you want to do?" footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <View className="gap-3">
        {PATHS.map((path, index) => (
          <Animated.View key={path.key} entering={FadeInUp.delay(380 + index * 90).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}>
            <SelectTile layout="row" selected={selected === path.key} onPress={() => setSelected(path.key)} title={path.title} caption={path.description} image={path.image} />
          </Animated.View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
