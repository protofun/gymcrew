import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { ExerciseActionsSheet } from "@/components/ExerciseActionsSheet";
import { ExerciseInstructionsModal } from "@/components/ExerciseInstructionsModal";
import { ExerciseSetRow } from "@/components/ExerciseSetRow";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { EXERCISE_BY_ID, formatMuscleName, type Exercise } from "@/data/exercises";
import { getExerciseHistory, getLastPerformance } from "@/lib/exercise-history";
import { kgToLbs } from "@/lib/units";
import type { LoggedExercise, LoggedSet, WeightUnit } from "@/store/active-workout-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const CARD_RADIUS = 24;
const THUMB_SIZE = 78;
const THUMB_STROKE = 4;
const THUMB_GAP = 3;
const THUMB_INNER = THUMB_SIZE - THUMB_STROKE * 2 - THUMB_GAP * 2;

type WorkoutLoggerProps = {
  exercise: LoggedExercise;
  unit: WeightUnit;
  expanded: boolean;
  onToggleExpand: () => void;
  onRemoveExercise: () => void;
  onReplaceExercise: () => void;
  onSetNote: (note: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<Omit<LoggedSet, "id">>) => void;
};

function formatSetNumbers(set: LoggedSet, unit: WeightUnit): string {
  const weight = set.weightKg === null ? "–" : Math.round(unit === "lbs" ? kgToLbs(set.weightKg) : set.weightKg);
  return `${weight}${unit} × ${set.reps ?? "–"}`;
}

/** "3d ago" / "2w ago" — compact enough for a small history chip. */
function formatAgo(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** The exercise thumbnail as a real progress ring (Reacticx `circular-progress`) instead of a plain
 * square photo — it fills to `completedCount/totalSets` and turns success-green once every set is
 * done, so the header's own image IS the "how far along am I" readout instead of a separate text
 * pill competing for the same row. A short spring "pop" (plus a success haptic) plays the moment the
 * ring first reaches 100% for this exercise — a small, genuinely earned payoff for finishing it,
 * not on every re-render, only the actual false→true transition. `CircularProgress` always wraps
 * itself in its own internal `Pressable` (see the round-5 lesson in AGENTS.md) — its `onPress` is
 * given directly here rather than adding a second, outer one. */
function ExerciseThumbnailRing({ imageUrl, progress, complete, onPress }: { imageUrl: string; progress: number; complete: boolean; onPress: () => void }) {
  const animatedProgress = useSharedValue(0);
  const bounce = useSharedValue(1);
  const wasComplete = useRef(complete);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, Math.max(0, progress * 100)), { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [progress, animatedProgress]);

  useEffect(() => {
    if (complete && !wasComplete.current) {
      bounce.value = withSequence(withTiming(1.16, { duration: 180, easing: Easing.out(Easing.back(2)) }), withTiming(1, { duration: 220 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasComplete.current = complete;
  }, [complete, bounce]);

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));

  return (
    <Animated.View style={bounceStyle}>
      <CircularProgress
        progress={animatedProgress}
        size={THUMB_SIZE}
        strokeWidth={THUMB_STROKE}
        gap={THUMB_GAP}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={complete ? colors.semantic.success : colors.brand.yellow}
        backgroundColor={colors.neutral.surfaceElevated}
        onPress={onPress}
        renderIcon={() =>
          imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: THUMB_INNER, height: THUMB_INNER, borderRadius: THUMB_INNER / 2 }} />
          ) : (
            <Ionicons name="barbell-outline" size={24} color={colors.neutral.textSecondary} />
          )
        }
      />
    </Animated.View>
  );
}

export function WorkoutLogger({
  exercise,
  unit,
  expanded,
  onToggleExpand,
  onRemoveExercise,
  onReplaceExercise,
  onSetNote,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: WorkoutLoggerProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(exercise.note);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const libraryExercise = EXERCISE_BY_ID[exercise.exerciseId];
  const instructions = libraryExercise?.instructions ?? [];
  // Custom exercises (not in the library) still get a modal — just with the logged exercise's own
  // name/photo and no muscle/instruction data to show.
  const instructionsExercise: Exercise =
    libraryExercise ?? {
      id: exercise.exerciseId,
      name: exercise.name,
      category: "strength",
      level: "intermediate",
      equipment: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: [],
      imageUrl: exercise.imageUrl,
    };

  useEffect(() => {
    setNoteDraft(exercise.note);
  }, [exercise.note]);

  function saveNote() {
    onSetNote(noteDraft.trim());
    setEditingNote(false);
  }

  const completedCount = exercise.sets.filter((set) => set.completed).length;
  const allDone = exercise.sets.length > 0 && completedCount === exercise.sets.length;

  const pastWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const lastPerformance = getLastPerformance(pastWorkouts, exercise.exerciseId);
  const history = getExerciseHistory(pastWorkouts, exercise.exerciseId);

  /** Drops a tapped history number straight into the first set that's still genuinely empty (never
   * touched, not just unfinished) — a real shortcut ("kijken wat welke cijfers je in het verleden
   * hebt behaald"), not just a readout, without overwriting anything already typed. */
  // The NEXT set that still needs numbers — "de past numbers wordt ingevoerd in de volgende invoer
  // veld." Requiring BOTH `weightKg` and `reps` to be `null` (as this used to) meant a set that
  // already had one of the two filled in — e.g. auto-filled from the row above, `autoFillPreviousSet`
  // in the workout settings — never counted as "still needs numbers," so tapping a history chip could
  // silently do nothing at all if every remaining set already had a partial value sitting in it. Any
  // not-yet-completed set now qualifies, and this history number overwrites whatever was there.
  function applyHistoryEntry(topSet: LoggedSet) {
    const targetSet = exercise.sets.find((set) => !set.completed);
    if (targetSet) onUpdateSet(targetSet.id, { weightKg: topSet.weightKg, reps: topSet.reps });
    setHistoryOpen(false);
  }

  return (
    <View>
      {/* Two rejections in a row on this one property: a yellow tint read as "busy/multicolored" next
          to the ring/progress bar's own color, and `surfaceElevated` — LIGHTER than the collapsed
          `surface` — still read as "grijs" regardless of tint. "het moet clean en donkerder zijn":
          `colors.neutral.background`, the app's own darkest, most neutral tone (darker than `surface`,
          not a lighter gray step up from it) — still zero border, glow, or animation, just a plain,
          darker fill. */}
      <View style={{ borderRadius: CARD_RADIUS, backgroundColor: expanded ? colors.neutral.background : colors.neutral.surface }} className="gap-3.5 p-5">
        <View className="flex-row items-center gap-3">
          <ExerciseThumbnailRing
            imageUrl={exercise.imageUrl}
            progress={exercise.sets.length > 0 ? completedCount / exercise.sets.length : 0}
            complete={allDone}
            onPress={onToggleExpand}
          />

          {/* `minWidth: 0` is load-bearing here, not decorative — without it this flex-shrinking
              column doesn't actually shrink on web, so a long exercise name pushes past its own flex
              basis and overlaps the fixed-size buttons to its right instead of wrapping/truncating
              ("het klokje en de 0/1 sets lopen door elkaar"). `numberOfLines` on the name is the other
              half of the same fix — one long word-wrapped title could still grow the row past two
              buttons' worth of space otherwise. */}
          <Pressable onPress={onToggleExpand} style={{ flex: 1, minWidth: 0 }} className="gap-1">
            <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodyBold, fontSize: 17, color: colors.brand.white }}>
              {exercise.name}
            </Text>
            {!!exercise.primaryMuscle && (
              <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, letterSpacing: 0.4, color: colors.brand.yellow }}>
                {formatMuscleName(exercise.primaryMuscle).toUpperCase()}
              </Text>
            )}
          </Pressable>

          {history.length > 0 && (
            <Pressable
              onPress={() => setHistoryOpen((open) => !open)}
              hitSlop={10}
              accessibilityLabel="View past numbers"
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: historyOpen ? colors.brand.yellow : colors.neutral.surfaceElevated }}
              className="items-center justify-center"
            >
              <Ionicons name="time-outline" size={17} color={historyOpen ? colors.brand.iron : colors.brand.yellow} />
            </Pressable>
          )}

          <Pressable onPress={() => setMenuVisible(true)} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.neutral.textSecondary} />
          </Pressable>

          <Pressable onPress={onToggleExpand} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        {/* The sets-progress readout gets its own full-width row now, below the header instead of
            squeezed into it beside the header's fixed-size buttons — the row that used to overlap. */}
        {exercise.sets.length > 0 && (
          <View className="flex-row items-center gap-2.5">
            <View style={{ flex: 1 }}>
              <AnimatedProgressBar
                progress={completedCount / exercise.sets.length}
                height={6}
                borderRadius={3}
                progressColor={allDone ? colors.semantic.success : colors.brand.yellow}
                trackColor={colors.neutral.divider}
                animationDuration={350}
              />
            </View>
            <View className="flex-row items-center gap-1">
              {allDone && <Ionicons name="checkmark-circle" size={13} color={colors.semantic.success} />}
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: allDone ? colors.semantic.success : colors.neutral.textSecondary }}>
                {`${completedCount}/${exercise.sets.length} sets`}
              </Text>
            </View>
          </View>
        )}

        {/* Past numbers for this exact exercise — a plain inline strip in the card's own flow now, not
            a `fan-menu` inside a `Modal`. The fan menu depended on `measureInWindow` positioning that
            kept misbehaving this deep in a `ScrollView` ("de arc menu werkt niet") — a normal flex row
            has no positioning to get wrong, so it just always renders where it's put. */}
        {historyOpen && history.length > 0 && (
          <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} className="gap-2">
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.neutral.textSecondary }}>PAST NUMBERS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {history.map((entry) => (
                <Pressable
                  key={entry.completedAt}
                  onPress={() => applyHistoryEntry(entry.topSet)}
                  style={{ borderRadius: 14, backgroundColor: colors.neutral.surface, borderWidth: 1, borderColor: colors.neutral.divider, paddingHorizontal: 14, paddingVertical: 10 }}
                  className="items-center gap-1"
                >
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.brand.white }}>{formatSetNumbers(entry.topSet, unit)}</Text>
                  <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.neutral.textSecondary }}>{formatAgo(entry.completedAt)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {expanded && (
          <>
            {editingNote ? (
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                onBlur={saveNote}
                multiline
                autoFocus
                placeholder="Add a note for this exercise..."
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-sm rounded-xl bg-background px-3 py-2.5 text-text-primary"
              />
            ) : (
              !!exercise.note && (
                <Pressable onPress={() => setEditingNote(true)}>
                  <Text className="body-sm italic text-text-secondary">{exercise.note}</Text>
                </Pressable>
              )
            )}

            <View className="gap-2.5">
              {exercise.sets.map((set, index) => (
                <ExerciseSetRow
                  key={set.id}
                  index={index + 1}
                  set={set}
                  unit={unit}
                  previousSet={lastPerformance?.[index] ?? null}
                  onUpdate={(updates) => onUpdateSet(set.id, updates)}
                  onRemove={() => onRemoveSet(set.id)}
                />
              ))}
            </View>

            <Pressable
              onPress={onAddSet}
              style={{ borderRadius: 16, borderColor: colors.brand.yellow }}
              className="flex-row items-center justify-center gap-1.5 border py-3"
            >
              <Ionicons name="add" size={16} color={colors.brand.yellow} />
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.brand.yellow }}>ADD SET</Text>
            </Pressable>
          </>
        )}
      </View>

      <ExerciseActionsSheet
        visible={menuVisible}
        exerciseName={exercise.name}
        hasNote={!!exercise.note}
        hasInstructions={instructions.length > 0}
        onClose={() => setMenuVisible(false)}
        onReplace={() => {
          setMenuVisible(false);
          onReplaceExercise();
        }}
        onEditNote={() => {
          setMenuVisible(false);
          // Deferred: opening the note TextInput (autoFocus) in the same tick as the sheet's Modal
          // unmounting races the two focus changes on web — the sheet's dismissal steals focus back
          // right after the TextInput grabs it, which fires onBlur and immediately closes the editor.
          setTimeout(() => setEditingNote(true), 300);
        }}
        onViewInstructions={() => {
          setMenuVisible(false);
          setInstructionsVisible(true);
        }}
        onRemove={() => {
          setMenuVisible(false);
          onRemoveExercise();
        }}
      />

      <ExerciseInstructionsModal
        exercise={instructionsVisible ? instructionsExercise : null}
        onClose={() => setInstructionsVisible(false)}
      />
    </View>
  );
}
