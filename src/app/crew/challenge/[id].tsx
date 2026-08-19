import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContributorsList } from "@/components/ContributorsList";
import { ProgressBar } from "@/components/ProgressBar";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import { CHALLENGE_TEMPLATES, CHALLENGE_XP_REWARD, type ChallengeMetric } from "@/data/challenges";
import { generateMemberWorkoutSessions } from "@/data/workout-log";
import {
  challengeFeed,
  challengeProgressTrend,
  crewChallengeProgress,
  perMemberContributions,
  simulatedOpponentProgress,
  weekKeyRange,
} from "@/lib/challenge-progress";
import { challengeHeroImage } from "@/lib/challenge-visuals";
import { fromDateKey, toDateKey } from "@/lib/date";
import { useChallengeStore } from "@/store/challenge-store";
import { useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const titleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 34,
  lineHeight: 36,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function parseWeeklyInstanceId(instanceId: string): { templateId: string; weekKey: string } | null {
  const parts = instanceId.split("-");
  if (parts.length < 4) return null;
  const weekKey = parts.slice(-3).join("-");
  const templateId = parts.slice(0, -3).join("-");
  if (!CHALLENGE_TEMPLATES.some((template) => template.id === templateId)) return null;
  return { templateId, weekKey };
}

function formatTimeLeft(endsAt: number, isComplete: boolean): string {
  if (isComplete) return "CRUSHED IT";
  const remainingMs = Math.max(0, endsAt - Date.now());
  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / (60 * 60 * 1000));
  if (days === 0 && hours === 0) return "Final hour — go!";
  return `${days} Day${days === 1 ? "" : "s"} ${hours} Hour${hours === 1 ? "" : "s"}`;
}

export default function ChallengeDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const members = useCrewStore((state) => state.members);
  const progressMap = useChallengeStore((state) => state.progress);
  const customChallenges = useChallengeStore((state) => state.customChallenges);

  const custom = id?.startsWith("custom-") ? customChallenges.find((challenge) => challenge.id === id) : undefined;
  const weekly = !custom && id ? parseWeeklyInstanceId(id) : null;
  const template = weekly ? CHALLENGE_TEMPLATES.find((item) => item.id === weekly.templateId) : null;

  if (!custom && !(weekly && template)) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-text-secondary">This challenge could not be found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const name = custom ? custom.name : template!.name;
  const description = custom ? custom.description : template!.description;
  const unit = custom ? custom.unit : template!.unit;
  const metric: ChallengeMetric = custom ? custom.metric : template!.metric;
  const target = custom ? custom.target : template!.perMemberTarget * members.length;

  let startKey: string;
  let endKey: string;
  let endsAt: number;
  if (custom) {
    startKey = toDateKey(new Date(custom.startedAt));
    endKey = toDateKey(new Date(custom.endsAt));
    endsAt = custom.endsAt;
  } else {
    const range = weekKeyRange(weekly!.weekKey);
    startKey = range.startKey;
    endKey = range.endKey;
    endsAt = fromDateKey(range.endKey).getTime() + DAY_MS - 1;
  }

  const myContribution = progressMap[id!] ?? 0;
  const progress = crewChallengeProgress(metric, members, myContribution, startKey, endKey, generateMemberWorkoutSessions);
  const isComplete = progress >= target || Date.now() > endsAt;
  const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));

  const contributors = perMemberContributions(metric, members, myContribution, startKey, endKey, generateMemberWorkoutSessions);
  const trend = challengeProgressTrend(metric, members, myContribution, startKey, endKey, generateMemberWorkoutSessions);
  const feed = challengeFeed(metric, unit, members, startKey, endKey, generateMemberWorkoutSessions);

  const opponent = custom
    ? { name: custom.opponentCrewName, progress: simulatedOpponentProgress(custom.id, custom.target, custom.startedAt, custom.endsAt) }
    : null;

  return (
    <View style={{ flex: 1 }} className="bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ height: 260 }}>
          <Image source={challengeHeroImage(metric)} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,17,23,0.55)" }} />
          <View
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140, backgroundColor: colors.neutral.background, opacity: 0.92 }}
          />

          <View style={{ paddingTop: insets.top + 8 }} className="absolute left-0 right-0 top-0 flex-row items-center px-4">
            <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-background/60">
              <Ionicons name="chevron-back" size={22} color={colors.brand.white} />
            </Pressable>
          </View>

          <View className="absolute bottom-4 left-4 right-4 gap-1">
            {isComplete ? (
              <View className="mb-1 flex-row items-center gap-1.5 self-start rounded-full bg-success px-2.5 py-1">
                <Ionicons name="trophy" size={12} color={colors.brand.iron} />
                <Text className="caption font-body-bold text-brand-iron">CRUSHED</Text>
              </View>
            ) : (
              <View className="mb-1 flex-row items-center gap-1.5 self-start rounded-full bg-brand-yellow px-2.5 py-1">
                <Ionicons name="flame" size={12} color={colors.brand.iron} />
                <Text className="caption font-body-bold text-brand-iron">CREW CHALLENGE</Text>
              </View>
            )}
            <Text style={titleStyle} className="text-brand-white">
              {name.toUpperCase()}
            </Text>
            <Text className="body-md text-text-secondary">{description}</Text>
          </View>
        </View>

        <View className="gap-4 px-4 pt-5">
          <View className={`gap-2 rounded-2xl border p-4 ${isComplete ? "border-success bg-success/10" : "border-brand-yellow/30 bg-brand-yellow/5"}`}>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="caption font-body-bold text-text-secondary" style={{ letterSpacing: 1 }}>
                  CREW PROGRESS
                </Text>
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 40, lineHeight: 42 }} className={isComplete ? "text-success" : "text-brand-yellow"}>
                  {percent}%
                </Text>
              </View>
              <Text className="body-md font-body-semibold text-text-primary">
                {progress.toLocaleString("en-US")} / {target.toLocaleString("en-US")} {unit}
              </Text>
            </View>
            <ProgressBar ratio={target > 0 ? progress / target : 0} color={isComplete ? colors.semantic.success : colors.brand.yellow} height={12} />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-streak/15">
                <Ionicons name="time" size={18} color={colors.semantic.streak} />
              </View>
              <View>
                <Text className="caption font-body-semibold text-text-secondary">TIME LEFT</Text>
                <Text className="body-lg font-body-bold text-text-primary">{formatTimeLeft(endsAt, isComplete)}</Text>
              </View>
            </View>

            <View className="flex-1 flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-yellow/15">
                <Ionicons name="flash" size={18} color={colors.brand.yellow} />
              </View>
              <View>
                <Text className="caption font-body-semibold text-text-secondary">XP REWARD</Text>
                <Text className="body-lg font-body-bold text-brand-yellow">+{CHALLENGE_XP_REWARD.toLocaleString("en-US")}</Text>
              </View>
            </View>
          </View>

          {opponent && (
            <View className="gap-2 rounded-2xl border border-divider bg-surface p-4">
              <Text className="body-sm font-body-bold text-text-primary" style={{ letterSpacing: 1 }}>
                VS {opponent.name.toUpperCase()}
              </Text>
              <ProgressBar ratio={target > 0 ? opponent.progress / target : 0} color={colors.neutral.textSecondary} height={8} />
              <Text className="caption text-text-secondary">
                {Math.min(opponent.progress, target).toLocaleString("en-US")} / {target.toLocaleString("en-US")} {unit}
              </Text>
            </View>
          )}

          {trend.length > 1 && (
            <View className="rounded-2xl border border-divider bg-surface p-4">
              <StrengthProgressChart exerciseName={name} points={trend} title="Crew Progress" unit={unit} />
            </View>
          )}

          <View className="gap-3">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 20 }} className="text-text-primary">
              TOP CONTRIBUTORS
            </Text>
            <ContributorsList contributors={contributors} unit={unit} />
          </View>

          {feed.length > 0 && (
            <View className="gap-3">
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 20 }} className="text-text-primary">
                CHALLENGE FEED
              </Text>
              <View className="gap-2.5">
                {feed.map((entry) => (
                  <View key={entry.id} className="flex-row items-center gap-3">
                    <Image source={{ uri: entry.avatarUrl }} className="rounded-full bg-divider" style={{ width: 28, height: 28 }} />
                    <Text className="body-sm flex-1 text-text-secondary">
                      <Text className="font-body-semibold text-text-primary">{entry.memberName}</Text> logged{" "}
                      {entry.amount.toLocaleString("en-US")} {entry.unit}
                    </Text>
                    <Text className="caption text-text-secondary">
                      {Math.max(1, Math.round((Date.now() - entry.timestamp) / (60 * 60 * 1000)))}h ago
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
