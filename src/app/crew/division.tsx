import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRow } from "@/components/HomeRow";
import { HomeRowLead } from "@/components/HomeRowLead";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { api, isApiConfigured, type ApiCrewLeaderboardEntry } from "@/lib/api";
import { DIVISION_COLOR, nextDivision, xpRequiredFor } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

export default function DivisionInfoScreen() {
  const insets = useSafeAreaInsets();
  const division = useCrewStore((state) => state.division);
  const divisionTopPercentile = useCrewStore((state) => state.divisionTopPercentile);
  const xp = useCrewStore((state) => state.xp);
  const myCrewId = useCrewStore((state) => state.id);
  const xpNeeded = xpRequiredFor(division);
  const next = nextDivision(division);

  // Real data — see crew/leaderboard.tsx's respondWithCrewLeaderboard fetch, which already
  // replaced the old static `OTHER_CREWS_POWER` mock. Pre-scoped to my crew's own division
  // server-side, so no local division filtering needed here.
  const [crews, setCrews] = useState<ApiCrewLeaderboardEntry[]>([]);
  useEffect(() => {
    if (!isApiConfigured) return;
    api.getCrewLeaderboard().then((result) => setCrews(result.crews)).catch((error) => console.warn("Failed to load crew leaderboard", error));
  }, []);

  const rivalCount = crews.filter((crew) => crew.id !== myCrewId).length;
  const rewards = [
    { key: "league", label: "Weekly League Standings", unlocked: true },
    { key: "badge", label: "Division Badge", unlocked: true },
    { key: "battles", label: `Battles vs ${rivalCount} Rival Crew${rivalCount === 1 ? "" : "s"}`, unlocked: rivalCount > 0 },
  ] as const;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Division Info</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3">
          <DivisionBadge division={division} size={156} />
          <AnimatedText
            text={division.toUpperCase()}
            animationConfig={{ characterDelay: 20 }}
            enterFrom={{ translateY: 20, scale: 0.6 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 32, lineHeight: 34, letterSpacing: 1, color: colors.brand.white }}
          />
          <EditableText id="crew.division.percentileNote" style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>
            {`You are in the top ${divisionTopPercentile}% of crews in your division.`}
          </EditableText>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text style={HOME_EYEBROW}>DIVISION PROGRESS</Text>
            <EditableText id="crew.division.progressXp" style={HOME_ROW_DETAIL}>
              {next ? `${xp.toLocaleString("en-US")} / ${xpNeeded.toLocaleString("en-US")} XP` : "Top division reached"}
            </EditableText>
          </View>
          <AnimatedProgressBar progress={next ? xp / xpNeeded : 1} height={8} borderRadius={4} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={900} />
        </View>

        <HomeRow>
          <View className="flex-row items-center justify-between">
            <Text style={HOME_EYEBROW}>NEXT DIVISION</Text>
            {next ? (
              <View className="flex-row items-center gap-2">
                <Text style={[HOME_ROW_TITLE, { fontSize: 18, lineHeight: 20, color: DIVISION_COLOR[next] }]}>{next.toUpperCase()}</Text>
                <DivisionBadge division={next} size={24} />
              </View>
            ) : (
              <Text style={[HOME_ROW_TITLE, { fontSize: 18, lineHeight: 20 }]}>YOU&apos;VE REACHED THE TOP</Text>
            )}
          </View>
        </HomeRow>

        <View className="gap-4">
          <Text style={HOME_EYEBROW}>DIVISION REWARDS</Text>
          <View className="gap-3">
            {rewards.map((reward) => (
              <View key={reward.key} className="flex-row items-center gap-3">
                <HomeRowLead kind="flat">
                  <Ionicons
                    name={reward.unlocked ? "checkmark-circle" : "lock-closed"}
                    size={18}
                    color={reward.unlocked ? colors.semantic.success : colors.neutral.textSecondary}
                  />
                </HomeRowLead>
                <Text className="body-md flex-1 text-text-primary">{reward.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/crew/all-divisions")}
          className="items-center rounded-full bg-surface py-4"
        >
          <Text className="body-md font-body-semibold text-text-primary">VIEW ALL DIVISIONS</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
