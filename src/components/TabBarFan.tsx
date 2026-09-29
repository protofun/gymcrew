import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { FAB_SIZE, PlusMark } from "@/components/TabBarFab";
import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { colors, fontFamily } from "@/theme";

/** How far the middle of the bar's raised button sits above the bottom of the screen, apart from the safe area. */
const FAB_LIFT = 32;
const ITEM_SIZE = 60;

/** The + in the middle of the bottom bar: one tap fans the quick things you do most up and to the left (Reacticx `fan-menu`, used
 * the way its own docs demo it — `direction="up"`, `itemDirection="left"` from a bottom-center trigger — with `spread` opened up
 * from the library's subtle default so six items read as a real fan instead of a tight stack). Drawn over the whole tab screen so
 * the fanned-out items are tappable wherever they land; the bar itself only keeps an empty slot for it. */
export function TabBarFan() {
  const insets = useSafeAreaInsets();
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const posthog = usePostHog();

  // Ordered nearest-to-the-button first — the fan-menu places the LAST item closest to the trigger, so
  // the action you reach for most (starting a workout) sits right where your thumb already is.
  const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; badge?: string; onPress: () => void }[] = [
    { label: "Log", icon: "calendar", onPress: () => router.navigate("/log") },
    { label: "Weight", icon: "scale", onPress: () => router.push("/profile/body-log") },
    { label: "Photo", icon: "images", onPress: () => router.push("/progress-photos/capture") },
    { label: "Food", icon: "restaurant", onPress: () => router.push("/nutrition/add") },
    { label: "Scan", icon: "camera", badge: "AI", onPress: () => router.push("/nutrition/scan-meal") },
    {
      label: "Workout",
      icon: "barbell",
      onPress: () => {
        startWorkout();
        posthog.capture("workout_started", { source: "fan_menu" });
        router.push("/workout/active");
      },
    },
  ];

  return (
    <FanMenu
      position="bottom-center"
      offset={{ vertical: (insets.bottom || 16) + FAB_LIFT, horizontal: 0 }}
      buttonSize={FAB_SIZE}
      direction="up"
      // Six items on one arc, all the same distance from the button (see utils.ts's GymCrew patch —
      // `spacing` is now a constant radius, not `spacing * rank`), spread evenly around a ~160°
      // sweep centered straight above it, so it reads as icons arranged around the button rather
      // than a cascade running off to one side.
      // `tilt` stays 0: the vendored item wrapper rotates around the center of a screen-width box
      // (styles.itemAnchor sets width: SCREEN_W) while the actual pill sits at its left edge, so any
      // nonzero rotation swings the pill many tens of px off its intended spot instead of a subtle tilt.
      spread={32}
      spacing={132}
      tilt={0}
      stagger={40}
    >
      <FanMenu.Trigger style={{ backgroundColor: colors.brand.yellow, borderWidth: 4, borderColor: colors.neutral.background }}>
        <PlusMark size={22} color={colors.brand.iron} />
      </FanMenu.Trigger>
      {actions.map((action) => (
        <FanMenu.Item
          key={action.label}
          value={action.label}
          onPress={action.onPress}
          style={{ width: ITEM_SIZE, flexDirection: "column", backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0, gap: 5, shadowOpacity: 0, elevation: 0 }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.neutral.surfaceElevated, borderWidth: 1, borderColor: colors.neutral.divider }} className="items-center justify-center">
            <Ionicons name={action.icon} size={20} color={colors.brand.yellow} />
            {action.badge && (
              <View style={{ position: "absolute", top: -4, right: -6, backgroundColor: colors.brand.yellow }} className="rounded-md px-1 py-0.5">
                <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 8, color: colors.brand.iron }}>{action.badge}</Text>
              </View>
            )}
          </View>
          <FanMenu.Label style={{ color: colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 10.5, textAlign: "center", width: ITEM_SIZE }}>{action.label}</FanMenu.Label>
        </FanMenu.Item>
      ))}
    </FanMenu>
  );
}
