import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CrewEventReactionBar } from "@/components/CrewEventReactionBar";
import { DivisionBadge } from "@/components/DivisionBadge";
import { HOME_ROW_DETAIL } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { RankBadge } from "@/components/RankBadge";
import { ContextMenu } from "@/components/ui/molecules/context-menu";
import { api, waitForAuthToken, type ApiCrewActivityEvent, type CrewActivityEventType, type CrewActivityReactionEmoji } from "@/lib/api";
import { describeEvent, divisionFromEvent, EVENT_ICON, EVENT_TINT, EVENT_TYPE_LABEL, tierForPrEvent, toggleReactionOptimistic } from "@/lib/crew-feed";
import { useBlockedUsersStore } from "@/store/blocked-users-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type FilterOption<T extends string> = { key: T; label: string };

const TYPE_OPTIONS: FilterOption<CrewActivityEventType | "all">[] = [
  { key: "all", label: "All" },
  ...(Object.entries(EVENT_TYPE_LABEL) as [CrewActivityEventType, string][]).map(([key, label]) => ({ key, label })),
];

function formatFullDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// A tap-open dropdown (Reacticx `context-menu`, its `onPress` — see the GymCrew patch on
// `ContextMenu.Trigger` — rather than its native long-press) instead of the app's usual
// trigger-pill-plus-bottom-sheet: the option list is short enough that a menu anchored right under
// the pill reads faster than a sheet sliding up from the bottom of the screen.
function FilterMenu<T extends string>({ label, options, selected, onSelect }: { label: string; options: FilterOption<T>[]; selected: T; onSelect: (key: T) => void }) {
  return (
    <ContextMenu theme="dark">
      <ContextMenu.Trigger openTrigger="press">
        <View className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5">
          <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
        </View>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        {options.map((option) => (
          <ContextMenu.Item key={option.key} onPress={() => onSelect(option.key)}>
            {option.key === selected && (
              <ContextMenu.Item.Icon>
                <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />
              </ContextMenu.Item.Icon>
            )}
            <ContextMenu.Item.Label>{option.label}</ContextMenu.Item.Label>
          </ContextMenu.Item>
        ))}
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** The full crew activity history — every PR / streak / long session / division-up event since the
 * crew started, with date + type + person filters. The compact `CrewFeedList` on the crew tab only
 * shows the 5 most recent; this is its "View all". */
export default function CrewActivityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const membersActivity = useCrewActivityStore((state) => state.membersActivity);
  const gender = useOnboardingStore((state) => state.onboarding.gender);
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg);
  const customExercises = useCustomExercisesStore((state) => state.exercises);

  const [events, setEvents] = useState<ApiCrewActivityEvent[] | null>(null);
  const blockedUserIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const [typeFilter, setTypeFilter] = useState<CrewActivityEventType | "all">("all");
  const [personFilter, setPersonFilter] = useState<string | "all">("all");

  useEffect(() => {
    // A hard refresh landing directly on this screen can fire before Clerk's session/token has
    // finished restoring, which the backend correctly rejects — see (tabs)/crew.tsx's own comment
    // on the same race. `since=1` (not 0 — falsy, would fall back to the backend's normal
    // last-14-days window) reaches all the way back to the crew's very first logged event.
    let cancelled = false;
    waitForAuthToken().then(() =>
      api
        .getCrewActivityEvents(1)
        .then((result) => {
          if (!cancelled) setEvents(result);
        })
        .catch(() => {
          if (!cancelled) setEvents([]);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function handleReact(eventId: number, emoji: CrewActivityReactionEmoji) {
    const target = events?.find((event) => event.id === eventId);
    if (!target) return;
    const previousReactions = target.reactions;

    setEvents((prev) =>
      prev?.map((event) => (event.id === eventId ? { ...event, reactions: toggleReactionOptimistic(event.reactions, emoji) } : event)) ?? prev,
    );

    api
      .reactToCrewActivityEvent(eventId, emoji)
      .then(({ reactions }) => {
        setEvents((prev) => prev?.map((event) => (event.id === eventId ? { ...event, reactions } : event)) ?? prev);
      })
      .catch((error) => {
        console.warn("Failed to react to crew activity event", error);
        setEvents((prev) => prev?.map((event) => (event.id === eventId ? { ...event, reactions: previousReactions } : event)) ?? prev);
      });
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/crew");
  }

  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const event of events ?? []) {
      if (blockedUserIds.includes(event.userId)) continue;
      seen.set(event.userId, event.userId === user?.id ? "You" : event.userName);
    }
    return Array.from(seen.entries());
  }, [events, user?.id, blockedUserIds]);

  const personOptions: FilterOption<string>[] = useMemo(
    () => [{ key: "all", label: "Everyone" }, ...people.map(([id, name]) => ({ key: id, label: name }))],
    [people],
  );

  const filtered = useMemo(() => {
    return (events ?? [])
      .filter((event) => !blockedUserIds.includes(event.userId))
      .filter((event) => typeFilter === "all" || event.eventType === typeFilter)
      .filter((event) => personFilter === "all" || event.userId === personFilter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [events, typeFilter, personFilter, blockedUserIds]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Crew Activity</Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 py-3">
        <FilterMenu label={`Type: ${TYPE_OPTIONS.find((o) => o.key === typeFilter)?.label ?? "All"}`} options={TYPE_OPTIONS} selected={typeFilter} onSelect={setTypeFilter} />
        {people.length > 1 && (
          <FilterMenu label={`Who: ${personOptions.find((o) => o.key === personFilter)?.label ?? "Everyone"}`} options={personOptions} selected={personFilter} onSelect={setPersonFilter} />
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {events === null ? (
          <View className="items-center py-14">
            <ActivityIndicator color={colors.brand.yellow} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center gap-2 py-14">
            <Ionicons name="pulse-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No activity yet.</Text>
          </View>
        ) : (
          filtered.map((event, index) => {
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
              <View key={event.id} className={`gap-3 py-3.5 ${index === filtered.length - 1 ? "" : "border-b border-divider"}`}>
                <View className="flex-row items-center gap-3">
                  {division ? (
                    <DivisionBadge division={division} size={40} />
                  ) : prTier ? (
                    <RankBadge tier={prTier} size={40} />
                  ) : (
                    <HomeRowLead kind="flat">
                      <Ionicons name={EVENT_ICON[event.eventType]} size={18} color={EVENT_TINT[event.eventType]} />
                    </HomeRowLead>
                  )}
                  <View className="flex-1 gap-0.5">
                    <Text className="body-sm text-text-primary">{describeEvent(event, isMe)}</Text>
                    <Text style={HOME_ROW_DETAIL}>{formatFullDate(event.createdAt)}</Text>
                  </View>
                </View>
                <View className="pl-[56px]">
                  <CrewEventReactionBar reactions={event.reactions} onReact={(emoji) => handleReact(event.id, emoji)} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
