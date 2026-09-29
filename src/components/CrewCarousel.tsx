import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import { AvatarStack } from "@/components/AvatarStack";
import { DivisionBadge } from "@/components/DivisionBadge";
import { EditableText } from "@/components/EditableText";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { TiltCarousel } from "@/components/ui/molecules/tilt-carousel";
import { exerciseImages } from "@/constants/images";
import { WORKOUT_NAME_HERO_IMAGE } from "@/data/workout-templates";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { nextDivision, xpRequiredFor } from "@/lib/division";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { colors, fontFamily } from "@/theme";

const ITEM_WIDTH = 250;
const ITEM_HEIGHT = 300;

type CardId = "division" | "power" | "members" | "plan";

/** The exact same flat shell `HomeCarousel`'s own `CarouselCard` uses — same `colors.neutral.surface`
 * fill, same radius/padding, no shadow — so this deck reads as one continuous product with Home's,
 * not a Crew-specific reskin of the idea. Not imported from `HomeCarousel.tsx` directly since that
 * file keeps its shell private to its own four cards; duplicating this one small shell here is
 * simpler than exporting it across an unrelated feature boundary for a single shared constant. */
function CarouselCard({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) {
  const content = (
    <View style={{ flex: 1, borderRadius: 26, backgroundColor: colors.neutral.surface, padding: 18 }} className="gap-3">
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

function CardLabel({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary }}>{children}</Text>;
}

function DivisionCard() {
  const division = useCrewStore((state) => state.division);
  const globalRank = useCrewStore((state) => state.globalRank);
  const region = useCrewStore((state) => state.region);
  const xp = useCrewStore((state) => state.xp);
  const xpNeeded = xpRequiredFor(division);
  const ratio = Number.isFinite(xpNeeded) ? xp / xpNeeded : 1;
  const progress = useSharedValue(0);
  const upNext = nextDivision(division);

  useEffect(() => {
    progress.value = withTiming(Math.min(100, ratio * 100), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  return (
    <CarouselCard onPress={() => router.push("/crew/division")}>
      <View className="flex-row items-center justify-between">
        <CardLabel>DIVISION</CardLabel>
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }} numberOfLines={1}>
          {`#${globalRank} ${region}`}
        </Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <CircularProgress
          progress={progress}
          size={110}
          strokeWidth={6}
          gap={4}
          outerCircleColor={colors.neutral.divider}
          progressCircleColor={colors.brand.yellow}
          backgroundColor="transparent"
          renderIcon={() => <DivisionBadge division={division} size={64} />}
        />
      </View>
      <View className="gap-1">
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 18, color: colors.brand.white }} numberOfLines={1}>
          {division.toUpperCase()}
        </Text>
        {upNext && (
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }} numberOfLines={1}>
            {`${Math.max(0, xpNeeded - xp).toLocaleString("en-US")} XP to ${upNext}`}
          </Text>
        )}
      </View>
    </CarouselCard>
  );
}

function PowerCard() {
  const crewPower = useCrewStore((state) => state.crewPower);
  const crewPowerChangePercent = useCrewStore((state) => state.crewPowerChangePercent);
  const members = useCrewStore((state) => state.members);
  const topContributors = [...members].sort((a, b) => b.level - a.level).slice(0, 2);

  return (
    <CarouselCard>
      <Pressable onPress={() => router.push("/crew/leaderboard")}>
        <CardLabel>CREW POWER</CardLabel>
        <View className="flex-row items-baseline gap-2 pt-1">
          <NumberFlow value={crewPower} fontSize={30} color={colors.brand.white} fontWeight="800" groupSeparator="," />
          <View className="flex-row items-center gap-1">
            <Ionicons name="trending-up" size={12} color={colors.semantic.success} />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.semantic.success }} numberOfLines={1}>
              {`+${crewPowerChangePercent}%`}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Real per-row interactivity, not just the whole card — tapping a top contributor jumps
          straight to their own member profile, "de carousel... meer vullen en interactief maken". */}
      <View className="flex-1 justify-center gap-2">
        {topContributors.map((member, index) => (
          <Pressable key={member.id} onPress={() => router.push(`/crew/member/${member.id}`)} className="flex-row items-center gap-2.5">
            <Image source={{ uri: member.avatarUrl }} className="rounded-full bg-divider" style={{ width: 30, height: 30 }} />
            <Text className="body-sm flex-1 font-body-semibold text-text-primary" numberOfLines={1}>
              {member.id === CURRENT_MEMBER_ID ? "You" : member.name}
            </Text>
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: index === 0 ? colors.brand.yellow : colors.neutral.textSecondary }}>
              {`#${index + 1}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </CarouselCard>
  );
}

function MembersCard() {
  const members = useCrewStore((state) => state.members);
  const maxMembers = useCrewStore((state) => state.maxMembers);
  // `isAdmin` comes straight through from the real backend member record (`normalizeCrew` in
  // crew-store.ts), unlike `isOnline` right next to it there — that field is hardcoded `true` for
  // every member, no real presence signal backs it at all. Round 13 shipped a live-looking "N
  // online now" dot built on that hardcoded value ("bij online klopt niet wie er online is") —
  // pulled entirely rather than relabeled, since there's no real online/presence system anywhere in
  // this app to source a genuine version of it from; showing nothing is more honest than showing a
  // value that will never be false. Admin count is real, so that's what replaces it.
  const adminCount = members.filter((member) => member.isAdmin).length;

  return (
    <CarouselCard>
      <Pressable onPress={() => router.push("/crew/members")} className="flex-row items-center justify-between">
        <CardLabel>MEMBERS</CardLabel>
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.brand.white }}>{`${members.length}/${maxMembers}`}</Text>
      </Pressable>

      {/* Real per-row interactivity, same as the top-contributor rows above — tap a member to open
          their own profile, not just the card as a whole. Each row's second line is their own real
          division (a genuine per-member backend field), not a fabricated status. */}
      <View className="flex-1 justify-center gap-2">
        {members.slice(0, 3).map((member) => (
          <Pressable key={member.id} onPress={() => router.push(`/crew/member/${member.id}`)} className="flex-row items-center gap-2.5">
            <Image source={{ uri: member.avatarUrl }} className="rounded-full bg-divider" style={{ width: 30, height: 30 }} />
            <View className="flex-1">
              <Text className="body-sm font-body-semibold text-text-primary" numberOfLines={1}>
                {member.id === CURRENT_MEMBER_ID ? "You" : member.name}
              </Text>
              <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.neutral.textSecondary }} numberOfLines={1}>
                {member.division}
              </Text>
            </View>
            {member.isAdmin && <Ionicons name="shield-checkmark" size={14} color={colors.brand.yellow} />}
          </Pressable>
        ))}
      </View>

      {adminCount > 0 && (
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>
          {`${adminCount} ${adminCount === 1 ? "admin" : "admins"}`}
        </Text>
      )}
    </CarouselCard>
  );
}

function PlanCard({ onPress }: { onPress: () => void }) {
  const members = useCrewStore((state) => state.members);
  const todayPlan = useCrewStore((state) => state.todayPlan);
  const today = useTodayWorkout();
  const workoutName = today.workoutName;
  const trainingAvatars = todayPlan.memberIdsTraining
    .map((id) => members.find((member) => member.id === id)?.avatarUrl)
    .filter((url): url is string => Boolean(url));
  const trainingCount = todayPlan.memberIdsTraining.length;
  const heroImage = WORKOUT_NAME_HERO_IMAGE[workoutName] ?? exerciseImages.benchPress;

  return (
    <CarouselCard onPress={onPress}>
      <CardLabel>TODAY&apos;S PLAN</CardLabel>
      <View className="flex-1 items-center justify-center">
        <Image source={heroImage} resizeMode="cover" style={{ width: 92, height: 92, borderRadius: 46 }} />
      </View>
      <View className="gap-1.5">
        <EditableText id="crew.todayPlan.workoutName" style={{ fontFamily: fontFamily.bodyBold, fontSize: 18, color: colors.brand.white }} numberOfLines={1}>
          {workoutName.toUpperCase()}
        </EditableText>
        {trainingCount > 0 ? (
          <View className="flex-row items-center justify-between">
            <EditableText id="crew.todayPlan.trainingCount" style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.semantic.success }}>
              {`${trainingCount} training now`}
            </EditableText>
            <AvatarStack avatarUrls={trainingAvatars} />
          </View>
        ) : (
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>Nobody&apos;s training yet</Text>
        )}
      </View>
    </CarouselCard>
  );
}

type CrewCarouselProps = {
  onPressPlan: () => void;
};

/** Crew's own version of Home's swipeable card deck (Reacticx `tilt-carousel`) — the same flat,
 * shadowless, no-ring `colors.neutral.surface` card language `HomeCarousel` established, applied to
 * Crew's own "quick glance" numbers (division, crew power, members, today's plan) instead of Home's.
 * These four used to be flowing `HomeRow`/`HomeRowLead` rows/a paired row — the same shape as
 * everywhere else on Crew, and everywhere else on Crew still IS that shape; this deck is deliberately
 * just these four, the ones that are genuinely "glance at one number" content, the same reasoning
 * `HomeCarousel` itself uses to decide what's IN the deck vs. a full-width section below it. */
export function CrewCarousel({ onPressPlan }: CrewCarouselProps) {
  const cards: CardId[] = ["division", "power", "members", "plan"];

  return (
    <TiltCarousel
      data={cards}
      keyExtractor={(id) => id}
      itemWidth={ITEM_WIDTH}
      itemHeight={ITEM_HEIGHT}
      marginHorizontal={10}
      rotationAngle={14}
      translateYValue={26}
      renderItem={({ item }) => {
        if (item === "division") return <DivisionCard />;
        if (item === "power") return <PowerCard />;
        if (item === "members") return <MembersCard />;
        return <PlanCard onPress={onPressPlan} />;
      }}
    />
  );
}
