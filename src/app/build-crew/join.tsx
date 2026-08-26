import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { OnboardingDots } from "@/components/OnboardingDots";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

export default function JoinCrewScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const joinCrewByCode = useCrewStore((state) => state.joinCrewByCode);
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
    router.replace("/home");
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
            Ask a friend for their crew&apos;s invite code.
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
              editable={!joining}
              className={`flex-1 rounded-xl border bg-background px-4 py-3 body-lg text-text-primary ${
                codeError ? "border-error" : "border-divider"
              }`}
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            <Pressable
              onPress={handleJoinWithCode}
              disabled={joining}
              className="items-center justify-center rounded-xl bg-brand-yellow px-5 py-3"
              style={({ pressed }) => ({ opacity: pressed || joining ? 0.85 : 1, minWidth: 64 })}
            >
              {joining ? <ActivityIndicator color={colors.brand.iron} /> : <Text className="heading-4 text-brand-iron">Join</Text>}
            </Pressable>
          </View>
          {codeError && <Text className="body-sm text-error">{codeError}</Text>}
        </Animated.View>

        <View className="mt-6 items-center">
          <OnboardingDots count={5} activeIndex={3} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
