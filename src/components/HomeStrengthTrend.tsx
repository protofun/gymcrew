import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { HOME_EYEBROW, HOME_SECTION_TITLE } from "@/components/homeStyle";
import { TrendChart } from "@/components/TrendChart";
import { FanMenu } from "@/components/ui/molecules/fan-menu";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { computeWeeklyDurationTrend, computeWeeklySetsTrend, computeWeeklyVolumeTrend, computeWeeklyWorkoutsTrend, type WeeklyMetric } from "@/lib/weekly-volume";
import { displayWeight } from "@/lib/units";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const { width: SCREEN_W } = Dimensions.get("window");

type HomeStrengthTrendProps = {
  workouts: CompletedWorkout[];
};

const METRICS: { key: WeeklyMetric; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "volume", title: "VOLUME PER WEEK", icon: "barbell" },
  { key: "sets", title: "SETS PER WEEK", icon: "layers" },
  { key: "workouts", title: "WORKOUTS PER WEEK", icon: "calendar" },
  { key: "duration", title: "MINUTES TRAINED PER WEEK", icon: "time" },
];

/** "Volume per week" used to be the only thing this chart could ever show — now a Reacticx `fan-menu`
 * arc on the card's own header lets you swap in sets, workout count or time trained instead
 * ("maak er een arc menu voor dropdown zodat ik ook andere dingen kan kiezen"). `layout="arc"` spreads
 * every item on one constant-radius circle, symmetric around `direction` (AGENTS.md's own fan-menu
 * note: `itemDirection` only ever tilts items, never re-centers the arc). `direction="left"` keeps the
 * whole arc swinging left of the trigger — the one safe choice for a button that sits near the card's
 * (and near the screen's) right edge, since a symmetric arc centered "down" would push its right half
 * straight toward/past the screen edge. `spread` is degrees PER ITEM STEP, not the arc's total width —
 * total sweep = `spread × (itemCount − 1)` (see `computeItemGeometry`'s `step` math), confirmed by
 * first trying `spread={100}` for 4 items, which produced a ~300° sweep that wrapped almost back
 * around to the right and put one item off-screen (caught via a real headless-browser click, not
 * guessed). `spread={25}` keeps the 4 items within a ~75° wedge centered on "left" — comfortably
 * between up-left and down-left, nowhere near the right edge regardless of the trigger's own position.
 *
 * `FanMenu` is built to anchor to a fixed screen corner (every other use in this app — TabBarFan,
 * NutritionAddFan, MealSlotFan — is a bottom-bar button, not something inside scrolling content), so
 * this card measures its own small header button's real on-screen position right before opening
 * (`measureInWindow`) and feeds that in as `offset` — the fan still blooms from the actual button, even
 * though this card scrolls with the page. The visible button lives in the card's own header row;
 * `FanMenu.Trigger` itself renders invisible and inert on top of it, since this component drives `open`
 * externally instead of letting the library's own trigger toggle it.
 *
 * The fan is wrapped in a plain `Modal` (see the Style Exception List — Modal is the app's one
 * approved escape-hatch for anything that must sit outside its surrounding layout). Confirmed via a
 * real headless-browser render, not guessed from reading the code: without the Modal, `FanMenu`'s own
 * `position: "absolute"` overlay lands relative to the nearest CSS-positioned ancestor, not the true
 * screen — on web, RN's `View` compiles to `position: relative` by default, so nested this deep
 * (`ScrollView > View > HomeReveal(Animated.View) > card View`) the item row rendered ~800px below the
 * real button, inside a different card further down the page. `Modal` portals its content to the true
 * document root on both web and native, so nesting depth stops mattering. Verified end-to-end with a
 * real click-through: opening the arc, selecting a metric, and watching the title, line and delta
 * label all update together.
 *
 * Round 2: items were sitting on top of each other ("de spread van de arc list moet beter alles zit nu
 * op elkaar") and the ask was icon-only, no label under each one. The overlap was really a radius
 * problem, not a spread problem — at `spacing={82}`/`spread={25}` adjacent 58px item circles landed
 * only ~34px apart center-to-center (chord length at that radius/angle), well inside their own
 * diameter. `spacing={105}`/`spread={36}` puts ~62px between adjacent 46px icon circles (icon-only
 * now, no `FanMenu.Label`, so the circles could also shrink to match `TabBarFan`'s own 46px icon-badge
 * size) — real daylight between them, tuned by measuring the actual rendered gap, not by feel.
 *
 * Round 4 tried making the wrapping `<Modal>` permanently mounted (`visible={true}` always, `FanMenu`'s
 * own `open` prop doing the show/hide) to fix the entrance animation never playing — real diagnosis
 * (`FanMenu` skips its spring on a component's literal first render, and `<Modal visible={menuOpen}>`
 * was remounting a fresh `FanMenu` on every open, hitting that skip every time), wrong fix. It broke the
 * entire app: "de hele website doet het niet ik kan niet scrollen of klikken" — a `Modal` is a real
 * blocking presentation layer (a separate native window on iOS/Android, a full-viewport fixed overlay
 * on web) that captures touches/scroll for everything underneath it for as long as it's mounted, full
 * stop — checking that `FanMenu`'s OWN children set `pointerEvents="none"` when closed was checking the
 * wrong layer; the `Modal` itself has no such opt-out, mounted or not, visible prop or not. Reverted to
 * `visible={menuOpen}` (conditional mount, matching every other `Modal` in this app).
 *
 * Round 6: still wanted the animation, without going anywhere near the `Modal`'s `visible` prop again.
 * Fix that doesn't touch `FanMenu`'s own internal spring at all: a plain `Animated.View` with
 * `entering={FadeIn}` wrapped around `<FanMenu>`, INSIDE the (still conditionally-mounted) `Modal`.
 * `entering` animations replay on every React mount, by design — unlike `FanMenu`'s own `firstRun`
 * skip, which is internal component state unaware of *why* it remounted. Since `Modal`'s conditional
 * `visible` still fully unmounts/remounts this wrapper on every open (same as it always did), the
 * `entering` animation fires every single time, no exceptions, with zero risk to the touch-blocking
 * regression from round 4 — nothing about the `Modal`'s own mount/visibility logic changed. Deliberately
 * a plain opacity fade, not a scale/zoom: the wrapper has to stay full-screen-sized (`position:
 * "absolute", inset 0`) so `FanMenu`'s own internal `position: "absolute"` anchor math (computed from
 * real screen coordinates via `measureInWindow`) still resolves against the true screen origin — a
 * `transform: scale` on that same full-screen box would visibly zoom from the SCREEN's center, not the
 * button's position, since the box being scaled is the whole overlay, not just the visible menu cluster
 * inside it. Opacity has no such origin problem. */
export function HomeStrengthTrend({ workouts }: HomeStrengthTrendProps) {
  const weightUnit = useWeightUnit();
  const [metric, setMetric] = useState<WeeklyMetric>("volume");
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState({ vertical: 80, horizontal: 20 });
  const triggerRef = useRef<View>(null);

  const rawPoints = useMemo(() => {
    if (metric === "sets") return computeWeeklySetsTrend(workouts);
    if (metric === "workouts") return computeWeeklyWorkoutsTrend(workouts);
    if (metric === "duration") return computeWeeklyDurationTrend(workouts);
    return computeWeeklyVolumeTrend(workouts);
  }, [workouts, metric]);

  const points = metric === "volume" ? rawPoints.map((point) => ({ ...point, value: displayWeight(point.value, weightUnit) })) : rawPoints;
  const unit = metric === "volume" ? weightUnit : metric === "duration" ? " min" : metric === "sets" ? " sets" : " workouts";
  const active = METRICS.find((entry) => entry.key === metric) ?? METRICS[0];

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ vertical: y, horizontal: SCREEN_W - x - width });
      setMenuOpen(true);
    });
  }

  if (points.length < 2) return null;

  return (
    <View style={{ borderRadius: 28, backgroundColor: colors.neutral.surface, padding: 20 }} className="gap-3">
      <View className="flex-row items-start justify-between">
        <View className="gap-1">
          <Text style={HOME_EYEBROW}>OBJECTIVE PROOF</Text>
          <Text style={[HOME_SECTION_TITLE, { fontSize: 24, lineHeight: 26 }]}>{active.title}</Text>
        </View>
        <Pressable ref={triggerRef} onPress={openMenu} hitSlop={8} accessibilityLabel="Choose a different metric" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
          <Ionicons name="options" size={16} color={colors.brand.yellow} />
        </Pressable>
      </View>

      <TrendChart points={points} unit={unit} title={active.title} />

      <Modal transparent visible={menuOpen} animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Animated.View entering={FadeIn.duration(160)} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <FanMenu open={menuOpen} onOpenChange={setMenuOpen} position="top-right" offset={anchor} buttonSize={36} direction="left" layout="arc" spacing={105} spread={36} tilt={0} stagger={40}>
            <FanMenu.Trigger style={{ opacity: 0 }} />
            {METRICS.map((entry) => {
              const selected = entry.key === metric;
              return (
                <FanMenu.Item
                  key={entry.key}
                  value={entry.key}
                  onPress={() => setMetric(entry.key)}
                  style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", paddingHorizontal: 0, paddingVertical: 0, backgroundColor: colors.neutral.surfaceElevated, borderWidth: 1, borderColor: selected ? colors.brand.yellow : colors.neutral.divider }}
                >
                  <Ionicons name={entry.icon} size={18} color={selected ? colors.brand.yellow : colors.neutral.textSecondary} />
                </FanMenu.Item>
              );
            })}
          </FanMenu>
        </Animated.View>
      </Modal>
    </View>
  );
}
