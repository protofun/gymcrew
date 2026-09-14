import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DivisionBadge } from "@/components/DivisionBadge";
import { FilterPickerSheet, type FilterOption } from "@/components/FilterPickerSheet";
import { RankBadge } from "@/components/RankBadge";
import { api, waitForAuthToken, type ApiCrewActivityEvent, type CrewActivityEventType } from "@/lib/api";
import { describeEvent, divisionFromEvent, EVENT_ICON, EVENT_TINT, EVENT_TYPE_LABEL, tierForPrEvent } from "@/lib/crew-feed";
import { useBlockedUsersStore } from "@/store/blocked-users-store";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

const TYPE_OPTIONS: FilterOption<CrewActivityEventType | "all">[] = [
  { key: "all", label: "All" },
  ...(Object.entries(EVENT_TYPE_LABEL) as [CrewActivityEventType, string][]).map(([key, label]) => ({ key, label })),
];

function formatFullDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function FilterTrigger({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={PRESSED_STYLE} className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5">
      <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
      <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
    </Pressable>
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
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [personMenuOpen, setPersonMenuOpen] = useState(false);

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

  const typeLabel = TYPE_OPTIONS.find((option) => option.key === typeFilter)?.label ?? "All";
  const personLabel = personOptions.find((option) => option.key === personFilter)?.label ?? "Everyone";

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Crew Activity</Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 py-3">
        <FilterTrigger label={`Type: ${typeLabel}`} onPress={() => setTypeMenuOpen(true)} />
        {people.length > 1 && <FilterTrigger label={`Who: ${personLabel}`} onPress={() => setPersonMenuOpen(true)} />}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {events === null ? (
          <View className="items-center py-14">
            <ActivityIndicator color={colors.brand.yellow} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="pulse-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No activity yet.</Text>
          </View>
        ) : (
          filtered.map((event) => {
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
              <View key={event.id} className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5">
                {division ? (
                  <DivisionBadge division={division} size={40} />
                ) : prTier ? (
                  <RankBadge tier={prTier} size={40} />
                ) : (
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${EVENT_TINT[event.eventType]}26` }}
                  >
                    <Ionicons name={EVENT_ICON[event.eventType]} size={18} color={EVENT_TINT[event.eventType]} />
                  </View>
                )}
                <View className="flex-1 gap-0.5">
                  <Text className="body-sm text-text-primary">{describeEvent(event, isMe)}</Text>
                  <Text className="caption text-text-secondary">{formatFullDate(event.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <FilterPickerSheet
        visible={typeMenuOpen}
        title="Filter by type"
        options={TYPE_OPTIONS}
        selected={typeFilter}
        onSelect={setTypeFilter}
        onClose={() => setTypeMenuOpen(false)}
      />
      <FilterPickerSheet
        visible={personMenuOpen}
        title="Filter by person"
        options={personOptions}
        selected={personFilter}
        onSelect={setPersonFilter}
        onClose={() => setPersonMenuOpen(false)}
      />
    </View>
  );
}
