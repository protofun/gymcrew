import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { OnboardingDots } from "@/components/OnboardingDots";
import { EXISTING_CREWS } from "@/data/crews";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

export default function JoinCrewScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const onboardingFullName = useOnboardingStore((state) => state.onboarding.fullName);
  const rejoin = useCrewStore((state) => state.rejoin);
  const [inviteCode, setInviteCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  function handleJoin(crewName: string) {
    setCrewData({ choice: "join", crewName });
    rejoin(crewName, onboardingFullName ?? "You");
    completeCrewSelection();
    router.replace("/home");
  }

  function handleJoinWithCode() {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setCodeError("Enter an invite code.");
      return;
    }
    setCodeError(null);
    handleJoin(trimmedCode);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-bold text-3xl text-text-primary"
          >
            Join a Crew
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
            className="font-body-medium text-lg leading-snug text-text-secondary"
          >
            Join with an invite code{"\n"}or explore public crews.
          </Animated.Text>
        </View>

        <Animated.View
          entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)}
          className="mt-6 gap-3 rounded-2xl border border-divider bg-surface p-5"
        >
          <Text className="heading-4 text-text-primary">Enter Invite Code</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text);
                setCodeError(null);
              }}
              placeholder="Enter code"
              placeholderTextColor={colors.neutral.textSecondary}
              autoCapitalize="characters"
              className={`flex-1 rounded-xl border bg-background px-4 py-3 body-lg text-text-primary ${
                codeError ? "border-error" : "border-divider"
              }`}
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            <Pressable
              onPress={handleJoinWithCode}
              className="rounded-xl bg-brand-yellow px-5 py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Text className="heading-4 text-brand-iron">Join</Text>
            </Pressable>
          </View>
          {codeError && <Text className="body-sm text-error">{codeError}</Text>}
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)}
          className="mb-3 mt-6 heading-4 text-text-primary"
        >
          Or explore crews
        </Animated.Text>

        <View className="gap-3">
          {EXISTING_CREWS.map((crew, index) => (
            <Animated.View
              key={crew.name}
              entering={FadeInUp.delay(240 + index * 60)
                .springify()
                .damping(14)
                .mass(0.6)}
              className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface p-4"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${crew.tint}26` }}
                >
                  <Ionicons name={crew.icon} size={22} color={crew.tint} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="heading-4 text-text-primary">{crew.name}</Text>
                  <Text className="body-sm text-text-secondary">
                    {crew.members} Members • {crew.category}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => handleJoin(crew.name)}
                className="rounded-xl bg-brand-yellow px-4 py-2"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="heading-4 text-brand-iron">Join</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <View className="mt-6 items-center">
          <OnboardingDots count={5} activeIndex={3} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
