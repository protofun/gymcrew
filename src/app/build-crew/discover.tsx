import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { CrewIconBadge } from "@/components/CrewIconBadge";
import { api, isApiConfigured, type ApiDiscoverableCrew } from "@/lib/api";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, spring } from "@/theme";

export default function DiscoverCrewsScreen() {
  const setCrewData = useOnboardingStore((state) => state.setCrewData);
  const completeCrewSelection = useOnboardingStore((state) => state.completeCrewSelection);
  const joinPublicCrew = useCrewStore((state) => state.joinPublicCrew);
  const posthog = usePostHog();
  const [crews, setCrews] = useState<ApiDiscoverableCrew[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured) {
      setCrews([]);
      return;
    }
    api
      .discoverCrews()
      .then(setCrews)
      .catch(() => setCrews([]));
  }, []);

  async function handleJoin(crew: ApiDiscoverableCrew) {
    setJoiningId(crew.id);
    const result = await joinPublicCrew(crew.id);
    setJoiningId(null);
    if (!result.ok) {
      Alert.alert("Couldn't Join", result.error);
      return;
    }
    setCrewData({ choice: "join" });
    completeCrewSelection();
    posthog.capture("crew_joined_via_discover", { crewId: crew.id });
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
          <Animated.Text entering={FadeInDown.springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} className="font-body-bold text-3xl text-text-primary">
            Discover Crews
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(80).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} className="font-body-medium text-lg leading-snug text-text-secondary">
            Public crews anyone can join instantly — no invite code needed.
          </Animated.Text>
        </View>

        <View className="mt-6 gap-3">
          {crews === null ? (
            <ActivityIndicator color={colors.brand.yellow} style={{ marginTop: 24 }} />
          ) : crews.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-divider bg-surface p-6">
              <Ionicons name="telescope-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-center text-text-secondary">No public crews yet — check back soon, or join with an invite code instead.</Text>
            </View>
          ) : (
            crews.map((crew) => (
              <View key={crew.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
                <CrewIconBadge iconKey={crew.icon} size={48} />
                <View className="flex-1 gap-0.5">
                  <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
                    {crew.name}
                  </Text>
                  {crew.tagline ? (
                    <Text className="body-sm text-text-secondary" numberOfLines={1}>
                      {crew.tagline}
                    </Text>
                  ) : null}
                  <Text className="caption text-text-secondary">
                    {crew.memberCount}/{crew.maxMembers} members{crew.trainingType ? ` · ${crew.trainingType}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleJoin(crew)}
                  disabled={joiningId !== null || crew.memberCount >= crew.maxMembers}
                  style={{ opacity: crew.memberCount >= crew.maxMembers ? 0.4 : joiningId && joiningId !== crew.id ? 0.5 : 1 }}
                  className="items-center justify-center rounded-full bg-brand-yellow px-4 py-2.5"
                >
                  {joiningId === crew.id ? (
                    <ActivityIndicator size="small" color={colors.brand.iron} />
                  ) : (
                    <Text className="body-sm font-body-bold text-brand-iron">{crew.memberCount >= crew.maxMembers ? "Full" : "Join"}</Text>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
