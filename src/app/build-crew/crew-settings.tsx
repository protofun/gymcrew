import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { FieldLabel, OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SegmentedField } from "@/components/SegmentedField";
import { ToggleRow } from "@/components/ToggleRow";
import { navIcons } from "@/constants/images";
import { crewProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";

// The keys are what the wizard stores (and crew-ready.tsx reads); the labels are just shorter to fit a row.
const VISIBILITY_OPTIONS = [
  { key: "Public", label: "Public" },
  { key: "Private", label: "Private" },
] as const;
const WHO_CAN_JOIN_OPTIONS = [
  { key: "Anyone", label: "Anyone" },
  { key: "Invite Only", label: "Invite only" },
  { key: "Approval Required", label: "Approval" },
] as const;
const MAX_MEMBERS_OPTIONS = [
  { key: "10 Members", label: "10" },
  { key: "20 Members", label: "20" },
  { key: "50 Members", label: "50" },
  { key: "100 Members", label: "100" },
] as const;

export default function CrewSettingsScreen() {
  const { crewName } = useLocalSearchParams<{ crewName?: string }>();
  const setCrewData = useOnboardingStore((state) => state.setCrewData);

  const [visibility, setVisibility] = useState<string>(VISIBILITY_OPTIONS[0].key);
  const [whoCanJoin, setWhoCanJoin] = useState<string>(WHO_CAN_JOIN_OPTIONS[0].key);
  const [allowChallenges, setAllowChallenges] = useState(true);
  const [allowInvitations, setAllowInvitations] = useState(true);
  const [maxMembers, setMaxMembers] = useState<string>(MAX_MEMBERS_OPTIONS[1].key);

  function handleContinue() {
    setCrewData({ visibility, whoCanJoin, allowChallenges, allowInvitations, maxMembers });
    router.push({ pathname: "/build-crew/crew-ready", params: { crewName: crewName ?? "" } });
  }

  return (
    <OnboardingScreen progress={crewProgress("settings")} title="Crew Settings" subtitle="Customize your crew preferences." footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <View className="gap-2">
        <FieldLabel>Crew visibility</FieldLabel>
        <SegmentedField options={VISIBILITY_OPTIONS} value={visibility as (typeof VISIBILITY_OPTIONS)[number]["key"]} onChange={setVisibility} />
      </View>
      <View className="gap-2">
        <FieldLabel>Who can join</FieldLabel>
        <SegmentedField options={WHO_CAN_JOIN_OPTIONS} value={whoCanJoin as (typeof WHO_CAN_JOIN_OPTIONS)[number]["key"]} onChange={setWhoCanJoin} />
      </View>
      <View className="gap-2">
        <FieldLabel>Max members</FieldLabel>
        <SegmentedField options={MAX_MEMBERS_OPTIONS} value={maxMembers as (typeof MAX_MEMBERS_OPTIONS)[number]["key"]} onChange={setMaxMembers} />
      </View>

      <View>
        <ToggleRow title="Allow Challenges" subtitle="Crew vs Crew challenges" image={navIcons.challenges} value={allowChallenges} onValueChange={setAllowChallenges} />
        <ToggleRow title="Allow Invitations" subtitle="Members can invite others" image={navIcons.friends} value={allowInvitations} onValueChange={setAllowInvitations} />
      </View>
    </OnboardingScreen>
  );
}
