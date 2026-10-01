import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { AttachStep } from "react-native-spotlight-tour";

import { ATTACH_INDEXES } from "@/components/AppTourOverlay";
import { HomeCarousel } from "@/components/HomeCarousel";
import { HomeHero } from "@/components/HomeHero";
import { HomeMuscleBalance } from "@/components/HomeMuscleBalance";
import { HomeReveal } from "@/components/HomeReveal";
import { HomeSkeleton } from "@/components/HomeSkeleton";
import { HomeStrengthTrend } from "@/components/HomeStrengthTrend";
import { PromoBanners } from "@/components/PromoBanners";
import { VisualTrainingCalendar } from "@/components/VisualTrainingCalendar";
import { computeCurrentStreak } from "@/lib/streak";
import { deriveWorkoutSessions } from "@/lib/workout-sessions";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSyncStatusStore } from "@/store/sync-status-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function HomeScreen() {
  const hasSyncedOnce = useSyncStatusStore((state) => state.hasSyncedOnce);
  const fullName = useOnboardingStore((state) => state.onboarding.fullName);
  const firstName = fullName?.trim().split(" ")[0] || "Athlete";
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const bodyWeightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const freezeDateKeys = useCurrencyStore((state) => state.freezeDateKeys);
  const streak = useMemo(() => computeCurrentStreak(workouts, new Date(), freezeDateKeys), [workouts, freezeDateKeys]);
  const sessions = useMemo(() => deriveWorkoutSessions(workouts, bodyWeightKg), [workouts, bodyWeightKg]);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const posthog = usePostHog();

  function handleStartWorkout() {
    startWorkout();
    posthog.capture("workout_started", { source: "home" });
    router.push("/workout/active");
  }

  // Blocks on the real database pull (see (tabs)/_layout.tsx and sync-status-store.ts) rather than
  // ever showing whatever happens to be sitting in local storage as if it were confirmed — a stale
  // or wrong-account local cache must never flash on screen even for a moment.
  if (!hasSyncedOnce) {
    return <HomeSkeleton />;
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
      <PromoBanners placement="home" />
      <AttachStep index={ATTACH_INDEXES.home} fill>
        <HomeHero name={firstName} workouts={workouts} streak={streak} onPressStartWorkout={handleStartWorkout} />
      </AttachStep>

      {/* Objective Proof (the strength trend) now sits directly under the hero, above the carousel —
          "ik wil dat de objective proof boven staat en dan pas de carousel". It's a full-width reading
          section (a chart's axes need real width), not a glance card, so it gets its own `mx-4` margin
          instead of joining the carousel's edge-to-edge bleed. */}
      <View className="mx-4 mt-6">
        <HomeReveal index={2} bleed tight>
          <HomeStrengthTrend workouts={workouts} />
        </HomeReveal>
      </View>

      {/* Home v5: the quick-glance widgets (this week's stats + muscle map, Nutrition, Rank, Goals)
          are a real swipeable card deck now (Reacticx `tilt-carousel`, bleeding to the screen edges),
          not a scrolling stack of sections — the tilt+lift motion as a card leaving center is where
          "depth" and "movement" come from, not a shadow or a ring drawn around something standing
          still. The deeper content below (the calendar, muscle recovery) stays full-width and
          scrollable — those need real reading width, not a glance — each its own flat color-filled
          block (no shadow) instead of the same gray box repeated. */}
      <HomeReveal index={3} bleed tight>
        <HomeCarousel workouts={workouts} gender={gender} streak={streak} sessions={sessions} />
      </HomeReveal>

      <View className="mx-4 mt-7 gap-7">
        <HomeReveal index={4} bleed tight>
          <View style={{ borderRadius: 28, backgroundColor: colors.neutral.surface, padding: 20 }}>
            <VisualTrainingCalendar workouts={workouts} gender={gender} streak={streak} />
          </View>
        </HomeReveal>

        <HomeReveal index={5} bleed tight>
          <HomeMuscleBalance workouts={workouts} />
        </HomeReveal>
      </View>
    </ScrollView>
  );
}
