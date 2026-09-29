import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { ContributorsList } from "@/components/ContributorsList";
import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { HomeRowPair } from "@/components/HomeRowPair";
import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { CHALLENGE_TEMPLATES, CHALLENGE_XP_REWARD, type ChallengeMetric } from "@/data/challenges";
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
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { displayWeight } from "@/lib/units";
import { useAdminChallengeStore } from "@/store/admin-challenge-store";
import { useChallengeStore } from "@/store/challenge-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (!Number.isFinite(endsAt)) return "Admin Event";
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
  const adminChallenges = useAdminChallengeStore((state) => state.challenges);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const memberActivityLookup = (memberId: string) => membersActivity[memberId] ?? { recentWorkouts: [], records: {} };
  const weightUnit = useWeightUnit();

  const custom = id?.startsWith("custom-") ? customChallenges.find((challenge) => challenge.id === id) : undefined;
  const admin = !custom && id?.startsWith("admin-challenge-") ? adminChallenges.find((challenge) => challenge.id === id) : undefined;
  const weekly = !custom && !admin && id ? parseWeeklyInstanceId(id) : null;
  const template = weekly ? CHALLENGE_TEMPLATES.find((item) => item.id === weekly.templateId) : null;
  const found = !!custom || !!admin || !!(weekly && template);

  const name = custom ? custom.name : admin ? admin.name : template?.name ?? "";
  const description = custom ? custom.description : admin ? admin.description : template!.description;
  const rawUnit = custom ? custom.unit : admin ? admin.unit : (template?.unit ?? "kg");
  const metric: ChallengeMetric = custom ? custom.metric : admin ? admin.metric : (template?.metric ?? { type: "totalVolume" });
  const rawTarget = custom ? custom.target : admin ? admin.perMemberTarget * members.length : (template?.perMemberTarget ?? 0) * members.length;

  // Only a "kg" challenge is a real stored weight — reps/sets/workouts pass through untouched, or
  // converting them would turn "10,000 reps" into nonsense.
  const isWeightChallenge = rawUnit === "kg";
  const unit = isWeightChallenge ? weightUnit : rawUnit;
  const toDisplay = (value: number) => (isWeightChallenge ? displayWeight(value, weightUnit) : value);
  const target = toDisplay(rawTarget);

  let startKey: string;
  let endKey: string;
  let endsAt: number;
  if (custom) {
    startKey = toDateKey(new Date(custom.startedAt));
    endKey = toDateKey(new Date(custom.endsAt));
    endsAt = custom.endsAt;
  } else if (admin) {
    // Admin challenges run until manually stopped (see admin-challenge-store.ts) — no fixed end
    // date, so completion is target-only (Date.now() > Infinity is never true).
    startKey = toDateKey(new Date(admin.createdAt));
    endKey = toDateKey(new Date());
    endsAt = Number.POSITIVE_INFINITY;
  } else if (weekly) {
    const range = weekKeyRange(weekly.weekKey);
    startKey = range.startKey;
    endKey = range.endKey;
    endsAt = fromDateKey(range.endKey).getTime() + DAY_MS - 1;
  } else {
    // Nothing resolved (bad/unknown id) — the not-found screen renders below; these just need to
    // not throw before every hook above it has run (see member/[id].tsx for the same ordering).
    startKey = toDateKey(new Date());
    endKey = startKey;
    endsAt = Date.now();
  }

  const myContribution = progressMap[id ?? ""] ?? 0;
  const progress = toDisplay(crewChallengeProgress(metric, members, myContribution, startKey, endKey, memberActivityLookup));
  const isComplete = progress >= target || Date.now() > endsAt;
  const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));

  const contributors = perMemberContributions(metric, members, myContribution, startKey, endKey, memberActivityLookup).map(
    (entry) => ({ ...entry, amount: toDisplay(entry.amount) }),
  );
  const trend = challengeProgressTrend(metric, members, myContribution, startKey, endKey, memberActivityLookup).map((point) => ({
    ...point,
    value: toDisplay(point.value),
  }));
  const feed = challengeFeed(metric, unit, members, startKey, endKey, memberActivityLookup).map((entry) => ({
    ...entry,
    amount: toDisplay(entry.amount),
  }));

  const opponent = custom
    ? {
        name: custom.opponentCrewName,
        progress: toDisplay(simulatedOpponentProgress(custom.id, custom.target, custom.startedAt, custom.endsAt)),
      }
    : null;

  const ringColor = isComplete ? colors.semantic.success : colors.brand.yellow;
  const ringProgress = useSharedValue(0);
  useEffect(() => {
    ringProgress.value = withTiming(Math.min(percent, 100), { duration: 900, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  if (!found) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center bg-background px-6">
        <Text className="body-md text-text-secondary">This challenge could not be found.</Text>
        <Pressable onPress={() => goBack("/(tabs)/crew")} className="mt-4">
          <Text className="body-md font-body-semibold text-brand-yellow">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/crew")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Challenge</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3">
          <Image source={challengeHeroImage(metric)} resizeMode="cover" style={{ width: 116, height: 116, borderRadius: 58 }} />
          {isComplete ? (
            <View className="flex-row items-center gap-1.5 self-center rounded-full bg-success px-2.5 py-1">
              <Ionicons name="trophy" size={12} color={colors.brand.iron} />
              <Text className="caption font-body-bold text-brand-iron">CRUSHED</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 self-center rounded-full bg-brand-yellow px-2.5 py-1">
              <Ionicons name="flame" size={12} color={colors.brand.iron} />
              <Text className="caption font-body-bold text-brand-iron">CREW CHALLENGE</Text>
            </View>
          )}
          <AnimatedText
            text={name.toUpperCase()}
            animationConfig={{ characterDelay: 14 }}
            enterFrom={{ translateY: 16, scale: 0.7 }}
            style={{ fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 28, letterSpacing: 1, color: colors.brand.white, textAlign: "center" }}
          />
          <EditableText id={`crew.challenge.${id}.description`} style={[HOME_ROW_DETAIL, { textAlign: "center" }]}>
            {description}
          </EditableText>
        </View>

        <View className="items-center gap-2">
          <CircularProgress
            progress={ringProgress}
            size={140}
            strokeWidth={10}
            gap={0}
            outerCircleColor={colors.neutral.divider}
            progressCircleColor={ringColor}
            backgroundColor="transparent"
            renderIcon={() => (
              <View className="flex-row items-baseline">
                <NumberFlow value={percent} fontSize={32} color={ringColor} fontWeight="800" />
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: ringColor }}>%</Text>
              </View>
            )}
          />
          <EditableText id={`crew.challenge.${id}.progressValue`} className="body-md font-body-semibold text-text-primary">
            {`${progress.toLocaleString("en-US")} / ${target.toLocaleString("en-US")} ${unit}`}
          </EditableText>
        </View>

        <HomeRowPair
          left={
            <View className="flex-row items-center gap-3">
              <HomeRowLead kind="flat">
                <Ionicons name="time" size={18} color={colors.semantic.streak} />
              </HomeRowLead>
              <View>
                <Text style={HOME_EYEBROW}>TIME LEFT</Text>
                <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]}>{formatTimeLeft(endsAt, isComplete)}</Text>
              </View>
            </View>
          }
          right={
            <View className="flex-row items-center gap-3">
              <HomeRowLead kind="flat">
                <Ionicons name="flash" size={18} color={colors.brand.yellow} />
              </HomeRowLead>
              <View>
                <Text style={HOME_EYEBROW}>XP REWARD</Text>
                <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18, color: colors.brand.yellow }]}>
                  {`+${CHALLENGE_XP_REWARD.toLocaleString("en-US")}`}
                </Text>
              </View>
            </View>
          }
        />

        {opponent && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text style={HOME_EYEBROW}>VS {opponent.name.toUpperCase()}</Text>
              {(() => {
                const winning = progress >= opponent.progress;
                return (
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={winning ? "trending-up" : "trending-down"}
                      size={13}
                      color={winning ? colors.semantic.success : colors.semantic.error}
                    />
                    <Text className="caption font-body-bold" style={{ color: winning ? colors.semantic.success : colors.semantic.error }}>
                      {winning ? "Ahead" : "Behind"}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="caption text-text-secondary">Your Crew</Text>
                <Text className="caption font-body-semibold text-text-primary">
                  {progress.toLocaleString("en-US")} {unit}
                </Text>
              </View>
              <AnimatedProgressBar progress={target > 0 ? progress / target : 0} height={8} borderRadius={4} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={800} />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="caption text-text-secondary">{opponent.name}</Text>
                <Text className="caption font-body-semibold text-text-primary">
                  {Math.min(opponent.progress, target).toLocaleString("en-US")} {unit}
                </Text>
              </View>
              <AnimatedProgressBar progress={target > 0 ? opponent.progress / target : 0} height={8} borderRadius={4} progressColor={colors.neutral.textSecondary} trackColor={colors.neutral.divider} animationDuration={800} />
            </View>
          </View>
        )}

        {trend.length > 1 && (
          <View className="gap-3">
            <Text style={HOME_EYEBROW}>PROGRESS OVER TIME</Text>
            <StrengthProgressChart exerciseName={name} points={trend} title="Crew Progress" unit={unit} />
          </View>
        )}

        {contributors.length > 0 && (
          <View className="gap-3">
            <Text style={HOME_EYEBROW}>TOP CONTRIBUTORS</Text>
            <ContributorsList contributors={contributors} unit={unit} />
          </View>
        )}

        {feed.length > 0 && (
          <View className="gap-3">
            <Text style={HOME_EYEBROW}>CHALLENGE FEED</Text>
            <View className="gap-3">
              {feed.map((entry) => (
                <View key={entry.id} className="flex-row items-center gap-3">
                  <HomeRowLead kind="image" source={{ uri: entry.avatarUrl }} />
                  <Text className="body-sm flex-1 text-text-secondary">
                    <Text className="font-body-semibold text-text-primary">{entry.memberName}</Text> logged {entry.amount.toLocaleString("en-US")}{" "}
                    {entry.unit}
                  </Text>
                  <Text style={HOME_ROW_DETAIL}>{Math.max(1, Math.round((Date.now() - entry.timestamp) / (60 * 60 * 1000)))}h ago</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
