import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { DivisionBadge } from "@/components/DivisionBadge";
import type { ApiCrewActivityEvent, CrewActivityEventType } from "@/lib/api";
import { DIVISIONS, type Division } from "@/lib/division";
import { formatShortAgo } from "@/lib/time-since";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { colors } from "@/theme";

const EVENT_ICON: Record<CrewActivityEventType, keyof typeof Ionicons.glyphMap> = {
  pr: "trophy",
  streak: "flame",
  long_session: "time",
  division_up: "ribbon",
};

const EVENT_TINT: Record<CrewActivityEventType, string> = {
  pr: colors.brand.yellow,
  streak: colors.semantic.streak,
  long_session: colors.semantic.info,
  division_up: colors.semantic.success,
};

function describeEvent(event: ApiCrewActivityEvent, isMe: boolean): string {
  const who = isMe ? "You" : event.userName;
  switch (event.eventType) {
    case "pr": {
      const { exerciseName, weightKg, reps } = event.payload as { exerciseName: string; weightKg: number; reps: number };
      return `${who} hit a new PR — ${exerciseName} ${weightKg}kg × ${reps}`;
    }
    case "streak": {
      const { days } = event.payload as { days: number };
      return `${who} ${isMe ? "are" : "is"} on a ${days}-day streak`;
    }
    case "long_session": {
      const { durationMinutes, workoutName } = event.payload as { durationMinutes: number; workoutName: string };
      return `${who} just crushed a ${durationMinutes}-minute ${workoutName} session`;
    }
    case "division_up": {
      const { division } = event.payload as { division: string };
      return `${who} reached ${division}`;
    }
    default:
      return who;
  }
}

/** The real division the "reached X" event is for, if the payload holds a recognized division name
 * — used so the feed row can show the actual medal instead of a generic ribbon icon. */
function divisionFromEvent(event: ApiCrewActivityEvent): Division | null {
  if (event.eventType !== "division_up") return null;
  const { division } = event.payload as { division: string };
  return (DIVISIONS as readonly string[]).includes(division) ? (division as Division) : null;
}

/** The crew-internal motivation feed — real, timestamped crewmate moments (PR / streak milestone /
 * long session / division up), logged from workout/active.tsx and profile-level-store.ts right when
 * each is detected. See backend/routes/crew-activity-events.php. Renders nothing until there's at
 * least one real event, same "don't show an empty state for a feature nobody's used yet" idea as
 * RecentAchievementCard. */
export function CrewFeedList() {
  const { user } = useUser();
  const events = useCrewFeedStore((state) => state.events);
  const fetchEvents = useCrewFeedStore((state) => state.fetch);

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
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="pulse" size={13} color={colors.brand.yellow} />
        <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
          CREW ACTIVITY
        </Text>
      </View>

      <View className="gap-3">
        {events.slice(0, 5).map((event) => {
          const division = divisionFromEvent(event);
          return (
            <View key={event.id} className="flex-row items-center gap-3">
              {division ? (
                <DivisionBadge division={division} size={36} />
              ) : (
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${EVENT_TINT[event.eventType]}26` }}
                >
                  <Ionicons name={EVENT_ICON[event.eventType]} size={16} color={EVENT_TINT[event.eventType]} />
                </View>
              )}
              <Text className="body-sm flex-1 text-text-secondary" numberOfLines={2}>
                {describeEvent(event, event.userId === user?.id)}
              </Text>
              <Text className="caption text-text-secondary">{formatShortAgo(event.createdAt)}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
