import { router } from "expo-router";
import { useState } from "react";
import { usePostHog } from "posthog-react-native";

import { AuthField } from "@/components/AuthField";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { crewProgress } from "@/lib/onboarding-steps";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function JoinCrewScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const joinCrewByCode = useCrewStore((state) => state.joinCrewByCode);
  const posthog = usePostHog();
  const [inviteCode, setInviteCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleJoinWithCode() {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setCodeError("Enter an invite code.");
      return;
    }
    setCodeError(null);
    setJoining(true);
    const result = await joinCrewByCode(trimmedCode);
    setJoining(false);
    if (!result.ok) {
      setCodeError(result.error);
      return;
    }
    setCrewData({ choice: "join" });
    completeCrewSelection();
    posthog.capture("crew_joined_via_code");
    router.replace("/home");
  }

  return (
    <OnboardingScreen progress={crewProgress("join-or-create")} title="Join a Crew" subtitle="Ask a friend for their crew's invite code.">
      <AuthField
        label="Invite code"
        placeholders={["CREW42", "A1B2C3", "Paste the code"]}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!joining}
        value={inviteCode}
        error={codeError}
        onChangeText={(text) => {
          setInviteCode(text);
          setCodeError(null);
        }}
      />
      <PrimaryButton label="Join Crew" loading={joining} onPress={handleJoinWithCode} />
      <PrimaryButton label="Browse Public Crews" variant="ghost" onPress={() => router.push("/build-crew/discover")} />
    </OnboardingScreen>
  );
}
