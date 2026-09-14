import { router } from "expo-router";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { SpotlightTourProvider, type RenderProps, type SpotlightTour, type TourStep } from "react-native-spotlight-tour";

import { images } from "@/constants/images";
import { TUTORIAL_CONTENT, type TutorialStepContent } from "@/data/tutorial-steps";
import { appTourRef } from "@/lib/app-tour";
import { useTutorialStore } from "@/store/tutorial-store";
import { fontFamily } from "@/theme";

const CARD_BG = "rgba(18,18,22,0.94)";
const MASCOT_SIZE = 128;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const titleStyle = { fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 28, fontStyle: "italic" as const, transform: [{ skewX: "-6deg" }] };

function StoryProgress({ total, current }: { total: number; current: number }) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className={`h-1 flex-1 rounded-full ${i <= current ? "bg-brand-yellow" : "bg-white/20"}`} />
      ))}
    </View>
  );
}

/** A one-shot pop-in — no idle loop. The only continuous motion is the library's own spotlight
 * pulse/transition between widgets. */
function TalkingMascot({ source }: { source: (typeof images)[keyof typeof images] }) {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.08, { duration: 260, easing: Easing.out(Easing.back(1.6)) }), withTiming(1, { duration: 140 }));
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, style]}>
      <Image source={source} resizeMode="contain" style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }} />
    </Animated.View>
  );
}

type TourCardProps = RenderProps & { content: TutorialStepContent; total: number };

function TourCard({ content, total, current, isFirst, isLast, next, previous, stop }: TourCardProps) {
  return (
    <View style={{ width: 260, alignItems: "center" }}>
      <TalkingMascot key={current} source={images[content.mascot]} />

      <Animated.View
        key={`text-${current}`}
        entering={FadeInUp.delay(100).duration(280)}
        className="mt-2 items-center gap-1 rounded-3xl px-5 py-3"
        style={{ backgroundColor: CARD_BG }}
      >
        <Text style={titleStyle} className="text-center text-brand-white">
          {content.title}
        </Text>
        <Text className="body-sm text-center text-text-secondary">{content.body}</Text>
      </Animated.View>

      <View className="mt-3 w-full gap-2.5">
        <StoryProgress total={total} current={current} />
        <View className="flex-row items-center justify-between">
          <Pressable onPress={stop} hitSlop={10}>
            <Text className="body-sm text-white/60">Skip</Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            {!isFirst && (
              <Pressable onPress={previous} hitSlop={10} className="rounded-full border border-white/25 px-4 py-2">
                <Text className="body-sm font-body-semibold text-white/80">Back</Text>
              </Pressable>
            )}
            <Pressable onPress={next} className="rounded-full bg-brand-yellow px-5 py-2">
              <Text className="body-sm font-body-bold text-brand-iron">{isLast ? "Let's go" : "Next"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function buildSteps(): TourStep[] {
  return TUTORIAL_CONTENT.map((content) => ({
    shape: { type: "rectangle", padding: 14 },
    before: async () => {
      router.replace(content.route);
      // Lets the target screen mount before the library measures its spotlight target — Expo
      // Router's navigation + the new screen's own layout pass aren't synchronous with this call.
      await new Promise((resolve) => setTimeout(resolve, 180));
    },
    render: (renderProps) => <TourCard content={content} total={TUTORIAL_CONTENT.length} {...renderProps} />,
  }));
}

/**
 * Wraps the tabs so a first-run, multi-page walkthrough can spotlight real widgets across Home,
 * Ranks, Crew, and Profile — narrated by the mascot popping in next to each one. Built on
 * react-native-spotlight-tour, which handles the actual masking/positioning (auto-flips and shifts
 * the tooltip to stay on screen, no matter where on the page the widget sits) so the tour itself
 * only has to say what to highlight and what to say about it (see data/tutorial-steps.ts and this
 * file's `ATTACH_INDEXES`). Auto-starts once per device (see (tabs)/_layout.tsx); replayable any
 * time via `appTourRef` — see the admin-only "Open Tutorial Wizard" button in profile/account.tsx.
 */
export function AppTourProvider({ children }: { children: ReactNode }) {
  const markTutorialSeen = useTutorialStore((state) => state.markTutorialSeen);
  const steps = useMemo(buildSteps, []);

  const setTourRef = useCallback((instance: SpotlightTour | null) => {
    appTourRef.current = instance;
  }, []);

  return (
    <SpotlightTourProvider
      ref={setTourRef}
      steps={steps}
      overlayColor="black"
      overlayOpacity={0.82}
      motion="fade"
      placement="bottom"
      arrow={{ color: CARD_BG }}
      onBackdropPress="continue"
      onStop={markTutorialSeen}
    >
      {children}
    </SpotlightTourProvider>
  );
}

/** Which tour step index(es) a given page's spotlighted widget belongs to — the welcome/outro
 * cards have no widget of their own, so they piggyback on the neighboring real step's target
 * (welcome shares Home's, outro shares Profile's) rather than floating over nothing. */
export const ATTACH_INDEXES: Record<"home" | "ranks" | "crew" | "profile", number[]> = {
  home: [0, 1],
  ranks: [2],
  crew: [3],
  profile: [4, 5],
};
