import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { CrewIconBadge } from "@/components/CrewIconBadge";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PulsingDots } from "@/components/ui/molecules/pulsing-dots";
import { images } from "@/constants/images";
import { api, isApiConfigured, type ApiDiscoverableCrew } from "@/lib/api";
import { useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

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
    <OnboardingScreen title="Discover Crews" subtitle="Public crews anyone can join instantly — no invite code needed.">
      {crews === null ? (
        <View className="items-center py-10">
          <PulsingDots color={colors.brand.yellow} radius={5} spacing={20} />
        </View>
      ) : crews.length === 0 ? (
        <View className="items-center gap-3 py-6">
          <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 130, height: 130 * (205 / 250) }} />
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 22, color: colors.neutral.textSecondary, textAlign: "center" }}>
            No public crews yet — check back soon, or join with an invite code instead.
          </Text>
        </View>
      ) : (
        <View>
          {crews.map((crew, index) => {
            const full = crew.memberCount >= crew.maxMembers;
            return (
              <Animated.View key={crew.id} entering={FadeInDown.delay(index * 70).duration(350)} className="flex-row items-center gap-3 border-b border-divider py-4">
                <CrewIconBadge iconKey={crew.icon} size={52} />
                <View className="flex-1 gap-0.5">
                  <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.8, color: colors.brand.white }} numberOfLines={1}>
                    {crew.name.toUpperCase()}
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
                  disabled={joiningId !== null || full}
                  style={{ opacity: full ? 0.4 : joiningId && joiningId !== crew.id ? 0.5 : 1, minWidth: 68, height: 40 }}
                  className="items-center justify-center rounded-full bg-brand-yellow px-4"
                >
                  {joiningId === crew.id ? <PulsingDots color={colors.brand.iron} radius={3} spacing={11} /> : <Text style={{ fontFamily: fontFamily.heading, fontSize: 18, letterSpacing: 1, color: colors.brand.iron }}>{full ? "FULL" : "JOIN"}</Text>}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </OnboardingScreen>
  );
}
