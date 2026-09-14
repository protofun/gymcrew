import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { DivisionBadge } from "@/components/DivisionBadge";
import { RankBadge } from "@/components/RankBadge";
import { describeEvent, divisionFromEvent, EVENT_ICON, EVENT_TINT, tierForPrEvent } from "@/lib/crew-feed";
import { formatShortAgo } from "@/lib/time-since";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

/** The crew-internal motivation feed — real, timestamped crewmate moments (PR / streak milestone /
 * long session / division up), logged from workout/active.tsx and profile-level-store.ts right when
 * each is detected. See backend/routes/crew-activity-events.php. Renders nothing until there's at
 * least one real event, same "don't show an empty state for a feature nobody's used yet" idea as
 * RecentAchievementCard. */
export function CrewFeedList() {
  const { user } = useUser();
  const events = useCrewFeedStore((state) => state.events);
  const fetchEvents = useCrewFeedStore((state) => state.fetch);
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const gender = useOnboardingStore((state) => state.onboarding.gender);
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const customExercises = useCustomExercisesStore((state) => state.exercises);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (events.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInUp.delay(360).springify().damping(16).mass(0.6)}
      className="mx-4 mt-3 gap-3 rounded-2xl border border-divider bg-surface p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="pulse" size={13} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
            CREW ACTIVITY
          </Text>
        </View>
        <Pressable onPress={() => router.push("/crew/activity")} hitSlop={6} style={PRESSED_STYLE}>
          <Text className="caption font-body-semibold text-brand-yellow">View all</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        {events.slice(0, 5).map((event) => {
          const isMe = event.userId === user?.id;
          const division = divisionFromEvent(event);
          const prTier = tierForPrEvent(
            event,
            isMe,
            { gender: gender ?? undefined, weightKg: weightKg ?? undefined },
            membersActivity,
            customExercises,
          );
          return (
            <View key={event.id} className="flex-row items-center gap-3">
              {division ? (
                <DivisionBadge division={division} size={36} />
              ) : prTier ? (
                <RankBadge tier={prTier} size={36} />
              ) : (
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${EVENT_TINT[event.eventType]}26` }}
                >
                  <Ionicons name={EVENT_ICON[event.eventType]} size={16} color={EVENT_TINT[event.eventType]} />
                </View>
              )}
              <Text className="body-sm flex-1 text-text-secondary" numberOfLines={2}>
                {describeEvent(event, isMe)}
              </Text>
              <Text className="caption text-text-secondary">{formatShortAgo(event.createdAt)}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
