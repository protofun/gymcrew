import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

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

// The week strip below matches VisualTrainingCalendar's day-cell style (same small silhouette,
// same flex-1/no-scroll 7-across row) — front and back are stacked vertically per day rather than
// side by side, so all 7 days still fit on screen at once without scrolling. Side by side (like
// the tray below) would double each day's width and no longer fit 7-across on a phone screen.
// Showing only one guessed side isn't good enough here — a leg day trains quads (front) and
// hamstrings/glutes (back) at once, so picking just one side showed the wrong muscles lit up as
// often as the right ones.
const FIGURE_HEIGHT = 46;
const BADGE_HEIGHT = 60;
const BADGE_GAP = 4;
const BADGE_WIDTH = Math.round(BADGE_HEIGHT * BODY_ASPECT_RATIO) * 2 + BADGE_GAP;

/** One entry in the reference tray below the week — `value` is what actually gets stored (`""`
 * for rest) once picked, via a day slot's own picker, `label` is only for display. */
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

/** A tiny gray/blank front+back pair for "nothing here yet" — keeps every slot the same shape as
 * a trained one instead of swapping in an unrelated icon-only box. */
function GhostFigure({ gender }: { gender: Gender }) {
  return (
    <View className="items-center justify-center gap-0.5">
      <MuscleHeatmap muscleIntensity={{}} height={FIGURE_HEIGHT} view="front" showViewLabel={false} showLegend={false} gender={gender} />
      <MuscleHeatmap muscleIntensity={{}} height={FIGURE_HEIGHT} view="back" showViewLabel={false} showLegend={false} gender={gender} />
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
}: {
  weekday: Weekday;
  assigned: string | undefined;
  isToday: boolean;
  accentColor: string;
  gender: Gender;
  onPress: () => void;
}) {
  const info = describeDay(assigned);

  return (
    <Pressable onPress={onPress} hitSlop={2} className="flex-1 items-center gap-1.5">
      <Text className={`caption ${isToday ? "font-body-bold" : "text-text-secondary"}`} style={isToday ? { color: accentColor } : undefined}>
        {WEEKDAY_SHORT_LABEL[weekday][0]}
      </Text>
      <View
        className={`items-center justify-center gap-0.5 rounded-lg ${isToday ? "border" : ""}`}
        style={{ padding: isToday ? 3 : 0, borderColor: isToday ? accentColor : undefined }}
      >
        {info.isRest ? (
          <View className="items-center justify-center" style={{ height: FIGURE_HEIGHT * 2 + 2 }}>
            <Ionicons name="moon" size={16} color={colors.neutral.textSecondary} />
          </View>
        ) : info.isSet ? (
          <>
            <MuscleHeatmap
              muscleIntensity={intensityForWorkoutName(assigned!)}
              height={FIGURE_HEIGHT}
              view="front"
              showViewLabel={false}
              showLegend={false}
              gender={gender}
            />
            <MuscleHeatmap
              muscleIntensity={intensityForWorkoutName(assigned!)}
              height={FIGURE_HEIGHT}
              view="back"
              showViewLabel={false}
              showLegend={false}
              gender={gender}
            />
          </>
        ) : (
          <GhostFigure gender={gender} />
        )}
      </View>
    </Pressable>
  );
}

/** A plain reference card — not draggable. A long-press-to-drag gesture living on the same row as
 * a horizontal ScrollView reliably starved the scroll of most touches (the pan gesture "held" the
 * touch during its whole activation window even on a quick swipe), and every assignment it could
 * do is already covered by tapping a day slot above, which opens the same searchable workout list.
 * Tap a badge here to see what it trains; tap a day to actually assign it. */
function WorkoutTrayBadge({ item, gender }: { item: TrayItem; gender: Gender }) {
  return (
    <View
      style={{ width: BADGE_WIDTH + 20 }}
      className="items-center gap-1.5 rounded-2xl border border-divider bg-surface p-2"
    >
      {item.isRest ? (
        <View className="items-center justify-center" style={{ width: BADGE_WIDTH, height: BADGE_HEIGHT }}>
          <Ionicons name="moon" size={22} color={colors.neutral.textSecondary} />
        </View>
      ) : (
        <MuscleHeatmap
          muscleIntensity={intensityForWorkoutName(item.value)}
          height={BADGE_HEIGHT}
          gap={BADGE_GAP}
          showViewLabel={false}
          showLegend={false}
          gender={gender}
        />
      )}
      <Text className="caption text-center font-body-semibold text-text-primary" numberOfLines={2}>
        {item.label}
      </Text>
    </View>
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
  const posthog = usePostHog();
  const savedSchedule = useOnboardingStore((state) => state.onboarding.weeklySchedule);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const gender: Gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const [schedule, setSchedule] = useState<Partial<Record<Weekday, string>>>(savedSchedule ?? {});
  const [dirty, setDirty] = useState(false);
  const [editingDay, setEditingDay] = useState<Weekday | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const today = currentWeekday();

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

  const missingGroups = useMemo(() => {
    const covered = weeklyMuscleCoverage(schedule);
    return ALL_MUSCLE_GROUPS.filter((group) => !covered.has(group));
  }, [schedule]);

  function commitSave() {
    setOnboardingData({ weeklySchedule: schedule });
    setDirty(false);
    setConfirmingSave(false);
    setJustSaved(true);
    posthog.capture("workout_split_saved", { trainingDays, missingMuscleGroups: missingGroups.length });
  }

  function handleSavePress() {
    if (missingGroups.length > 0) setConfirmingSave(true);
    else commitSave();
  }

  const trainingDays = WEEKDAYS.filter((day) => schedule[day] && schedule[day] !== "").length;
  const restDays = WEEKDAYS.filter((day) => schedule[day] === "").length;
  const coveredCount = ALL_MUSCLE_GROUPS.length - missingGroups.length;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
          hitSlop={8}
          style={{ position: "absolute", left: 16 }}
        >
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
          <View style={heroShadow} className="flex-row rounded-3xl border border-divider bg-surface p-4">
            {WEEKDAYS.map((weekday) => (
              <DaySlot
                key={weekday}
                weekday={weekday}
                assigned={schedule[weekday]}
                isToday={weekday === today}
                accentColor={accentColor}
                gender={gender}
                onPress={() => setEditingDay(weekday)}
              />
            ))}
          </View>
          <Text className="caption text-center text-text-secondary">Tap a day to assign a workout</Text>
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
            WORKOUT TYPES
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {TRAY_ITEMS.map((item) => (
              <WorkoutTrayBadge key={item.key} item={item} gender={gender} />
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
