import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const VISIBILITY_OPTIONS = ["Public", "Private"] as const;
const WHO_CAN_JOIN_OPTIONS = ["Anyone", "Invite Only", "Approval Required"] as const;
const MAX_MEMBERS_OPTIONS = ["10 Members", "20 Members", "50 Members", "100 Members"] as const;

type SettingsSelectRowProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

function SettingsSelectRow({ label, value, options, onChange }: SettingsSelectRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-xl border border-divider bg-surface px-4 py-4">
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center justify-between">
        <Text className="body-md text-text-primary">{label}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="body-md text-text-secondary">{value}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.neutral.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.neutral.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            className="gap-2 p-6"
          >
            <Text className="heading-4 mb-2 text-text-primary">{label}</Text>
            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="border-b border-divider py-3"
              >
                <Text className={`body-md ${option === value ? "text-brand-yellow" : "text-text-primary"}`}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type SettingsToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingsToggleRow({ title, subtitle, value, onValueChange }: SettingsToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-divider bg-surface px-4 py-4">
      <View className="flex-1 gap-1 pr-3">
        <Text className="body-md text-text-primary">{title}</Text>
        <Text className="body-sm text-text-secondary">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
        thumbColor={colors.brand.white}
      />
    </View>
  );
}

export default function CrewSettingsScreen() {
  const { crewName } = useLocalSearchParams<{ crewName?: string }>();
  const setCrewData = useOnboardingStore((state) => state.setCrewData);

  const [visibility, setVisibility] = useState<string>(VISIBILITY_OPTIONS[0]);
  const [whoCanJoin, setWhoCanJoin] = useState<string>(WHO_CAN_JOIN_OPTIONS[0]);
  const [allowChallenges, setAllowChallenges] = useState(true);
  const [allowInvitations, setAllowInvitations] = useState(true);
  const [maxMembers, setMaxMembers] = useState<string>(MAX_MEMBERS_OPTIONS[1]);

  function handleContinue() {
    setCrewData({ visibility, whoCanJoin, allowChallenges, allowInvitations, maxMembers });
    router.push({ pathname: "/build-crew/crew-ready", params: { crewName: crewName ?? "" } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-3xl text-center text-text-primary"
          >
            Crew Settings
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-medium text-lg text-center text-text-secondary"
          >
            Customize your crew{"\n"}preferences.
          </Animated.Text>
        </View>

        <Animated.View
          entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)}
          className="mt-6 gap-3"
        >
          <SettingsSelectRow
            label="Crew Visibility"
            value={visibility}
            options={VISIBILITY_OPTIONS}
            onChange={setVisibility}
          />
          <SettingsSelectRow
            label="Who can join"
            value={whoCanJoin}
            options={WHO_CAN_JOIN_OPTIONS}
            onChange={setWhoCanJoin}
          />
          <SettingsToggleRow
            title="Allow Challenges"
            subtitle="Crew vs Crew challenges"
            value={allowChallenges}
            onValueChange={setAllowChallenges}
          />
          <SettingsToggleRow
            title="Allow Invitations"
            subtitle="Members can invite others"
            value={allowInvitations}
            onValueChange={setAllowInvitations}
          />
          <SettingsSelectRow
            label="Max Members"
            value={maxMembers}
            options={MAX_MEMBERS_OPTIONS}
            onChange={setMaxMembers}
          />
        </Animated.View>

        <View className="mt-8">
          <OnboardingFooter label="Continue" activeIndex={4} dotCount={5} onPress={handleContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
