import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, type View as RNView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeInUp, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { StatTile } from "@/components/StatTile";
import { TodayWorkoutModal } from "@/components/TodayWorkoutModal";
import { BODY_ASPECT_RATIO } from "@/data/body-muscle-paths";
import { DEFAULT_SPLIT_THEME, SPLIT_THEMES } from "@/data/split-themes";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { WEEKDAY_SHORT_LABEL, WEEKDAYS, type Weekday } from "@/data/weekdays";
import { ALL_TEMPLATES, getTemplatesForSplit, intensityForWorkoutName } from "@/data/workout-templates";
import { divisionIndex } from "@/lib/division";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { currentWeekday } from "@/lib/weekly-schedule";
import { useOnboardingStore, type Gender } from "@/store/onboarding-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useThemeStore } from "@/store/theme-store";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see profile.tsx's identical constraint).
const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

// A shadow (StyleSheet exception — see AGENTS.md) on the page's one hero card, so it reads as the
// clear focal point rather than just another bordered box.
const heroShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 6,
};

// Same tall, narrow aspect as the training-calendar body figures elsewhere — a shape a square
// slot would waste most of, since the silhouette itself is tall and thin.
const SLOT_HEIGHT = 62;
const SLOT_WIDTH = Math.round(SLOT_HEIGHT * BODY_ASPECT_RATIO);
const BADGE_HEIGHT = 60;
const BADGE_WIDTH = Math.round(BADGE_HEIGHT * BODY_ASPECT_RATIO);

/** What a tray badge drags onto a day — `value` is what actually gets stored (`""` for rest),
 * `label` is only for display. */
type TrayItem = { key: string; label: string; value: string; isRest?: boolean };

const TRAY_ITEMS: TrayItem[] = [
  { key: "rest", label: "Rest Day", value: "", isRest: true },
  ...ALL_TEMPLATES.map((template) => ({ key: template.key, label: template.name, value: template.name })),
];

function describeDay(assigned: string | undefined): { isSet: boolean; isRest: boolean } {
  if (assigned === undefined) return { isSet: false, isRest: false };
  if (assigned === "") return { isSet: true, isRest: true };
  return { isSet: true, isRest: false };
}

/** Every muscle group at least one day of the week trains — the rest are what the save-time
 * warning flags. A custom-typed workout with no matching template contributes nothing here (no
 * fabricated data), same "no data = no claim" convention as the rest of the app. */
function weeklyMuscleCoverage(schedule: Partial<Record<Weekday, string>>): Set<MuscleGroup> {
  const covered = new Set<MuscleGroup>();
  for (const name of Object.values(schedule)) {
    if (!name) continue;
    const intensity = intensityForWorkoutName(name);
    for (const group of Object.keys(intensity) as MuscleGroup[]) {
      if ((intensity[group] ?? 0) > 0) covered.add(group);
    }
  }
  return covered;
}

const QUICK_FILL_SPLITS: { label: string; icon: keyof typeof Ionicons.glyphMap; split: string }[] = [
  { label: "Push / Pull / Legs", icon: "sync-outline", split: "Push / Pull / Legs" },
  { label: "Upper / Lower", icon: "swap-vertical-outline", split: "Upper / Lower" },
  { label: "Full Body", icon: "fitness-outline", split: "Full Body" },
  { label: "Bro Split", icon: "body-outline", split: "Bro Split (Body Part Split)" },
];

/** Cycles a split's day templates across Monday–Saturday, Sunday always off — a simple, universal
 * default (e.g. a 3-day PPL becomes Push/Pull/Legs/Push/Pull/Legs/Rest) rather than trying to model
 * every real program's exact rest-day placement. */
function quickFillSchedule(split: string): Partial<Record<Weekday, string>> {
  const templates = getTemplatesForSplit(split);
  const next: Partial<Record<Weekday, string>> = {};
  WEEKDAYS.forEach((weekday, index) => {
    next[weekday] = weekday === "Sunday" ? "" : templates[index % templates.length].name;
  });
  return next;
}

/** A tiny gray/blank silhouette for "nothing here yet" — keeps every slot the same shape as a
 * trained one instead of swapping in an unrelated icon-only box. */
function GhostFigure({ gender }: { gender: Gender }) {
  return (
    <View className="items-center justify-center" style={{ width: SLOT_WIDTH, height: SLOT_HEIGHT }}>
      <MuscleHeatmap muscleIntensity={{}} height={SLOT_HEIGHT} view="front" showViewLabel={false} showLegend={false} gender={gender} />
      <View className="absolute items-center justify-center rounded-full bg-background" style={{ width: 16, height: 16 }}>
        <Ionicons name="add" size={10} color={colors.neutral.textSecondary} />
      </View>
    </View>
  );
}

function DaySlot({
  weekday,
  assigned,
  isToday,
  accentColor,
  gender,
  onPress,
  onMeasureRef,
}: {
  weekday: Weekday;
  assigned: string | undefined;
  isToday: boolean;
  accentColor: string;
  gender: Gender;
  onPress: () => void;
  onMeasureRef: (node: RNView | null) => void;
}) {
  const info = describeDay(assigned);

  return (
    <Pressable onPress={onPress} hitSlop={2} className="items-center gap-1.5">
      <Text className={`caption ${isToday ? "font-body-bold" : "text-text-secondary"}`} style={isToday ? { color: accentColor } : undefined}>
        {WEEKDAY_SHORT_LABEL[weekday][0]}
      </Text>
      <View
        ref={onMeasureRef}
        collapsable={false}
        className={`items-center justify-center overflow-hidden rounded-xl border ${isToday ? "border-2" : "border border-divider"}`}
        style={{ width: SLOT_WIDTH + 10, height: SLOT_HEIGHT + 10, borderColor: isToday ? accentColor : undefined }}
      >
        {info.isRest ? (
          <Ionicons name="moon" size={16} color={colors.neutral.textSecondary} />
        ) : info.isSet ? (
          <MuscleHeatmap muscleIntensity={intensityForWorkoutName(assigned!)} height={SLOT_HEIGHT} view="front" showViewLabel={false} showLegend={false} gender={gender} />
        ) : (
          <GhostFigure gender={gender} />
        )}
      </View>
    </Pressable>
  );
}

function WorkoutTrayBadge({
  item,
  dragX,
  dragY,
  gender,
  onDragStart,
  onDragEnd,
}: {
  item: TrayItem;
  dragX: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
  gender: Gender;
  onDragStart: (item: TrayItem) => void;
  onDragEnd: (item: TrayItem, x: number, y: number) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // A brief hold before the drag activates — without it, every horizontal swipe meant to scroll
  // this row gets stolen as a drag instead. A long-press disambiguates the two: a quick swipe
  // scrolls (the pan below never activates in time and cedes to the parent ScrollView), a hold
  // means "pick this up".
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      scale.value = withSpring(1.12);
      runOnJS(onDragStart)(item);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
    })
    .onEnd((event) => {
      runOnJS(onDragEnd)(item, event.absoluteX, event.absoluteY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[style, { width: 82 }]}
        collapsable={false}
        className="items-center gap-1.5 rounded-2xl border border-divider bg-surface p-2"
      >
        {item.isRest ? (
          <View className="items-center justify-center" style={{ width: BADGE_WIDTH, height: BADGE_HEIGHT }}>
            <Ionicons name="moon" size={22} color={colors.neutral.textSecondary} />
          </View>
        ) : (
          <MuscleHeatmap muscleIntensity={intensityForWorkoutName(item.value)} height={BADGE_HEIGHT} view="front" showViewLabel={false} showLegend={false} gender={gender} />
        )}
        <Text className="caption text-center font-body-semibold text-text-primary" numberOfLines={2}>
          {item.label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

function SplitThemePicker({
  themeKey,
  unlockedDivisionIndex,
  purchasedThemeKeys,
  onSelect,
}: {
  themeKey: string;
  unlockedDivisionIndex: number;
  purchasedThemeKeys: string[];
  onSelect: (key: string) => void;
}) {
  return (
    <View className="flex-row gap-2.5">
      {SPLIT_THEMES.map((theme) => {
        const unlocked = divisionIndex(theme.unlockDivision) <= unlockedDivisionIndex || purchasedThemeKeys.includes(theme.key);
        const selected = theme.key === themeKey;
        return (
          <Pressable
            key={theme.key}
            onPress={() => unlocked && onSelect(theme.key)}
            className="items-center gap-1"
            style={({ pressed }) => ({ opacity: pressed && unlocked ? 0.75 : 1 })}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 34,
                height: 34,
                backgroundColor: unlocked ? theme.color : colors.neutral.surface,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? colors.neutral.textPrimary : colors.neutral.divider,
              }}
            >
              {!unlocked && <Ionicons name="lock-closed" size={13} color={colors.neutral.textSecondary} />}
            </View>
            <Text className="caption text-text-secondary" numberOfLines={1} style={{ maxWidth: 56, textAlign: "center" }}>
              {unlocked ? theme.label : theme.unlockDivision}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MissingMuscleGroupsModal({
  visible,
  missingGroups,
  onKeepEditing,
  onSaveAnyway,
}: {
  visible: boolean;
  missingGroups: MuscleGroup[];
  onKeepEditing: () => void;
  onSaveAnyway: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepEditing}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }} onPress={onKeepEditing}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: colors.neutral.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          className="gap-4 p-5"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
              <Ionicons name="alert-circle" size={22} color={colors.semantic.warning} />
            </View>
            <View className="flex-1">
              <Text className="heading-4 text-text-primary">A few muscles are uncovered</Text>
              <Text className="caption text-text-secondary">Nothing in your week trains these — worth a look?</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {missingGroups.map((group) => (
              <View key={group} className="rounded-full border border-divider bg-background px-3 py-1.5">
                <Text className="caption font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={onSaveAnyway} className="items-center rounded-full bg-brand-yellow py-4">
            <Text className="body-md font-body-semibold text-brand-iron">Save Anyway</Text>
          </Pressable>
          <Pressable onPress={onKeepEditing} className="items-center py-1">
            <Text className="body-md font-body-semibold text-text-secondary">Keep Editing</Text>
          </Pressable>

          <View style={{ height: insets.bottom }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function WorkoutSplitScreen() {
  const insets = useSafeAreaInsets();
  const savedSchedule = useOnboardingStore((state) => state.onboarding.weeklySchedule);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const gender: Gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const [schedule, setSchedule] = useState<Partial<Record<Weekday, string>>>(savedSchedule ?? {});
  const [dirty, setDirty] = useState(false);
  const [editingDay, setEditingDay] = useState<Weekday | null>(null);
  const [draggedItem, setDraggedItem] = useState<TrayItem | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const today = currentWeekday();

  const dayRefs = useRef<Partial<Record<Weekday, RNView | null>>>({});
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const personalDivision = useProfileLevelStore((state) => state.division);
  const splitThemeKey = useThemeStore((state) => state.splitThemeKey);
  const setSplitTheme = useThemeStore((state) => state.setSplitTheme);
  const purchasedThemeKeys = useThemeStore((state) => state.purchasedThemeKeys);
  const unlockedDivisionIndex = divisionIndex(personalDivision);
  const activeTheme =
    SPLIT_THEMES.find(
      (theme) => theme.key === splitThemeKey && (divisionIndex(theme.unlockDivision) <= unlockedDivisionIndex || purchasedThemeKeys.includes(theme.key)),
    ) ?? DEFAULT_SPLIT_THEME;
  const accentColor = activeTheme.color;

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [justSaved]);

  function updateSchedule(next: Partial<Record<Weekday, string>>) {
    setSchedule(next);
    setDirty(true);
  }

  function assignDay(weekday: Weekday, workoutName: string) {
    updateSchedule({ ...schedule, [weekday]: workoutName });
  }

  function handleDrop(item: TrayItem, dropX: number, dropY: number) {
    setDraggedItem(null);
    for (const weekday of WEEKDAYS) {
      const node = dayRefs.current[weekday];
      if (!node) continue;
      node.measure((_x, _y, width, height, pageX, pageY) => {
        if (dropX >= pageX && dropX <= pageX + width && dropY >= pageY && dropY <= pageY + height) {
          assignDay(weekday, item.value);
        }
      });
    }
  }

  const missingGroups = useMemo(() => {
    const covered = weeklyMuscleCoverage(schedule);
    return ALL_MUSCLE_GROUPS.filter((group) => !covered.has(group));
  }, [schedule]);

  function commitSave() {
    setOnboardingData({ weeklySchedule: schedule });
    setDirty(false);
    setConfirmingSave(false);
    setJustSaved(true);
  }

  function handleSavePress() {
    if (missingGroups.length > 0) setConfirmingSave(true);
    else commitSave();
  }

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value - (BADGE_WIDTH + 16) / 2 }, { translateY: dragY.value - (BADGE_HEIGHT + 16) / 2 }],
  }));

  const trainingDays = WEEKDAYS.filter((day) => schedule[day] && schedule[day] !== "").length;
  const restDays = WEEKDAYS.filter((day) => schedule[day] === "").length;
  const coveredCount = ALL_MUSCLE_GROUPS.length - missingGroups.length;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Workout Split</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-3">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            YOUR WEEK
          </Text>
          <View style={heroShadow} className="flex-row justify-between rounded-3xl border border-divider bg-surface p-4">
            {WEEKDAYS.map((weekday) => (
              <DaySlot
                key={weekday}
                weekday={weekday}
                assigned={schedule[weekday]}
                isToday={weekday === today}
                accentColor={accentColor}
                gender={gender}
                onPress={() => setEditingDay(weekday)}
                onMeasureRef={(node) => {
                  dayRefs.current[weekday] = node;
                }}
              />
            ))}
          </View>
          <Text className="caption text-center text-text-secondary">Tap a day, or hold and drag one below onto it</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(40).springify().damping(16).mass(0.6)} className="gap-3">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            ACCENT THEME
          </Text>
          <SplitThemePicker
            themeKey={splitThemeKey}
            unlockedDivisionIndex={unlockedDivisionIndex}
            purchasedThemeKeys={purchasedThemeKeys}
            onSelect={setSplitTheme}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="flex-row gap-3">
          <StatTile id="profile.workoutSplit.trainingDays" icon="barbell" value={String(trainingDays)} label="Training" />
          <StatTile id="profile.workoutSplit.restDays" icon="moon" value={String(restDays)} label="Rest" />
          <StatTile
            id="profile.workoutSplit.coverage"
            icon="body"
            value={`${coveredCount}/${ALL_MUSCLE_GROUPS.length}`}
            label="Coverage"
            iconColor={missingGroups.length === 0 ? colors.semantic.success : colors.semantic.warning}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-3">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            DRAG A WORKOUT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {TRAY_ITEMS.map((item) => (
              <WorkoutTrayBadge key={item.key} item={item} dragX={dragX} dragY={dragY} gender={gender} onDragStart={setDraggedItem} onDragEnd={handleDrop} />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).springify().damping(16).mass(0.6)} className="gap-3">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            QUICK FILL
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {QUICK_FILL_SPLITS.map((option) => (
              <Pressable
                key={option.split}
                onPress={() => updateSchedule(quickFillSchedule(option.split))}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                className="items-center gap-2 rounded-2xl border border-divider bg-surface px-4 py-3"
              >
                <Ionicons name={option.icon} size={20} color={accentColor} />
                <Text className="caption font-body-semibold text-text-primary" numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-t border-divider bg-background px-4 pt-3"
      >
        <Pressable
          onPress={handleSavePress}
          disabled={!dirty && !justSaved}
          className={`items-center rounded-full py-4 ${justSaved ? "bg-success" : !dirty ? "bg-surface" : ""}`}
          style={dirty ? { backgroundColor: accentColor } : undefined}
        >
          <Text className={`body-md font-body-semibold ${dirty ? "text-brand-iron" : justSaved ? "text-brand-iron" : "text-text-secondary"}`}>
            {justSaved ? "Saved ✓" : dirty ? "Save Changes" : "Saved"}
          </Text>
        </Pressable>
      </View>

      {draggedItem && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0 }, overlayStyle]}>
          <View
            className="items-center justify-center gap-1 rounded-2xl border-2 bg-surface p-2"
            style={{ width: BADGE_WIDTH + 16, height: BADGE_HEIGHT + 16, borderColor: accentColor }}
          >
            {draggedItem.isRest ? (
              <Ionicons name="moon" size={22} color={colors.neutral.textSecondary} />
            ) : (
              <MuscleHeatmap muscleIntensity={intensityForWorkoutName(draggedItem.value)} height={BADGE_HEIGHT} view="front" showViewLabel={false} showLegend={false} gender={gender} />
            )}
          </View>
        </Animated.View>
      )}

      <TodayWorkoutModal
        visible={editingDay !== null}
        title={editingDay ?? "Today's Training"}
        onClose={() => setEditingDay(null)}
        isOverridden={false}
        onClearOverride={() => {}}
        onSave={(name) => {
          if (editingDay) assignDay(editingDay, name);
          setEditingDay(null);
        }}
      />

      <MissingMuscleGroupsModal
        visible={confirmingSave}
        missingGroups={missingGroups}
        onKeepEditing={() => setConfirmingSave(false)}
        onSaveAnyway={commitSave}
      />
    </View>
  );
}
