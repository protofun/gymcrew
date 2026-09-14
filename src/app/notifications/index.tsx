import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterPickerSheet, type FilterOption } from "@/components/FilterPickerSheet";
import type { AppNotification, NotificationCategory } from "@/data/notifications";
import { api, waitForAuthToken, type ApiCrewActivityEvent } from "@/lib/api";
import { buildCreatineReminderNotification, buildCrewNotifications, buildNotifications } from "@/lib/notifications";
import { computeCurrentStreak } from "@/lib/streak";
import { useBlockedUsersStore } from "@/store/blocked-users-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  pr: "PRs",
  streak: "Streaks",
  crew: "Crew",
  reminder: "Reminders",
};

const CATEGORY_OPTIONS: FilterOption<NotificationCategory | "all">[] = [
  { key: "all", label: "All" },
  ...(Object.entries(CATEGORY_LABEL) as [NotificationCategory, string][]).map(([key, label]) => ({ key, label })),
];

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

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

/** The full notification history — every real PR, streak nudge, crewmate moment, and reminder ever
 * surfaced, with date + type filters. The header bell dropdown only shows the most recent few; this
 * is its "View all". Crew events are re-fetched from the beginning (`since=1`) rather than reusing
 * the bell's own 14-day-windowed store, so nothing from before that window is missing here. */
export default function NotificationsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const freezeDateKeys = useCurrencyStore((state) => state.freezeDateKeys);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const blockedUserIds = useBlockedUsersStore((state) => state.blockedUserIds);

  const [crewEvents, setCrewEvents] = useState<ApiCrewActivityEvent[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "all">("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    // A hard refresh landing directly on this screen can fire before Clerk's session/token has
    // finished restoring, which the backend correctly rejects — see (tabs)/crew.tsx's own comment
    // on the same race.
    let cancelled = false;
    waitForAuthToken().then(() =>
      api
        .getCrewActivityEvents(1)
        .then((result) => {
          if (!cancelled) setCrewEvents(result);
        })
        .catch(() => {
          if (!cancelled) setCrewEvents([]);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  const streakDays = useMemo(() => computeCurrentStreak(workouts, new Date(), freezeDateKeys), [workouts, freezeDateKeys]);

  const notifications = useMemo(() => {
    if (crewEvents === null) return null;
    const personal = buildNotifications(
      workouts,
      streakDays,
      { weightKg: onboarding.weightKg, gender: onboarding.gender, age: onboarding.age },
      customExercises,
      Date.now(),
      Number.MAX_SAFE_INTEGER,
    );
    const crew = buildCrewNotifications(crewEvents, user?.id, Date.now(), blockedUserIds);
    const creatine = buildCreatineReminderNotification(onboarding.creatineReminders ?? true, onboarding.creatineReminderTime ?? "09:00");
    return [...personal, ...crew, ...creatine].sort((a, b) => b.timestamp - a.timestamp);
  }, [crewEvents, workouts, streakDays, onboarding, customExercises, user?.id, blockedUserIds]);

  useEffect(() => {
    if (notifications) markAllRead(notifications.map((notification) => notification.id));
  }, [notifications, markAllRead]);

  const filtered = (notifications ?? []).filter((notification) => categoryFilter === "all" || notification.category === categoryFilter);
  const categoryLabel = CATEGORY_OPTIONS.find((option) => option.key === categoryFilter)?.label ?? "All";

  function handlePress(notification: AppNotification) {
    if (notification.workoutId) router.push({ pathname: "/workout/summary", params: { id: notification.workoutId } });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Notifications</Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 py-3">
        <FilterTrigger label={`Type: ${categoryLabel}`} onPress={() => setCategoryMenuOpen(true)} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {notifications === null ? (
          <View className="items-center py-14">
            <ActivityIndicator color={colors.brand.yellow} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="notifications-off-outline" size={28} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">No notifications yet.</Text>
          </View>
        ) : (
          filtered.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handlePress(notification)}
              disabled={!notification.workoutId}
              style={({ pressed }) => ({ opacity: pressed && notification.workoutId ? 0.7 : 1 })}
              className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
                <Image source={notification.icon} resizeMode="contain" style={{ width: 26, height: 26 }} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="body-sm text-text-primary">{notification.title}</Text>
                <Text className="caption text-text-secondary">{formatFullDate(notification.timestamp)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FilterPickerSheet
        visible={categoryMenuOpen}
        title="Filter by type"
        options={CATEGORY_OPTIONS}
        selected={categoryFilter}
        onSelect={setCategoryFilter}
        onClose={() => setCategoryMenuOpen(false)}
      />
    </View>
  );
}
