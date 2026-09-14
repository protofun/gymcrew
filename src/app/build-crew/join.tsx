import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { OnboardingDots } from "@/components/OnboardingDots";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => goBack()}
          hitSlop={8}
          className="mb-2 h-9 w-9 items-center justify-center rounded-full border border-divider"
        >
          <Ionicons name="chevron-back" size={20} color={colors.neutral.textPrimary} />
        </Pressable>

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
            Ask a friend for their crew&apos;s invite code.
          </Animated.Text>
        </View>

        <Animated.View
          entering={FadeInUp.delay(150).springify().damping(14).mass(0.6)}
          className="mt-6 gap-3 rounded-2xl border border-divider bg-surface p-5"
        >
          <Text className="heading-4 text-text-primary">Enter Invite Code</Text>
          <TextInput
            value={inviteCode}
            onChangeText={(text) => {
              setInviteCode(text);
              setCodeError(null);
            }}
            placeholder="Enter code"
            placeholderTextColor={colors.neutral.textSecondary}
            autoCapitalize="characters"
            editable={!joining}
            className={`rounded-xl border bg-background px-4 py-3 body-lg text-text-primary ${
              codeError ? "border-error" : "border-divider"
            }`}
            style={{ outlineWidth: 0, outlineColor: "transparent" }}
          />
          {codeError && <Text className="body-sm text-error">{codeError}</Text>}
          <Pressable
            onPress={handleJoinWithCode}
            disabled={joining}
            className="items-center justify-center rounded-xl bg-brand-yellow py-3.5"
            style={({ pressed }) => ({ opacity: pressed || joining ? 0.85 : 1 })}
          >
            {joining ? <ActivityIndicator color={colors.brand.iron} /> : <Text className="heading-4 text-brand-iron">Join Crew</Text>}
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="mt-4">
          <Pressable
            onPress={() => router.push("/build-crew/discover")}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-divider py-3.5"
          >
            <Ionicons name="telescope-outline" size={18} color={colors.neutral.textSecondary} />
            <Text className="body-md font-body-semibold text-text-secondary">Browse Public Crews</Text>
          </Pressable>
        </Animated.View>

        <View className="mt-6 items-center">
          <OnboardingDots count={5} activeIndex={3} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
