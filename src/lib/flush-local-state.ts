import { pushState } from "@/lib/backend-sync";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useCosmeticsStore } from "@/store/cosmetics-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useCustomWorkoutsStore } from "@/store/custom-workouts-store";
import { useFavoriteExercisesStore } from "@/store/favorite-exercises-store";
import { useGoalsStore } from "@/store/goals-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useThemeStore } from "@/store/theme-store";
import { useTodayTrainingStore } from "@/store/today-training-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { useWorkoutNotesStore } from "@/store/workout-notes-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";

/**
 * Pushes every already-collected local store to the backend once, unconditionally — not just on
 * the next mutation. Needed because a store's local state can be genuinely real (the user set it
 * up) while never having reached the database — e.g. every push silently failed while the backend
 * was unreachable (see backend/diag.php's history). `pullState`'s "backend wins" pull alone can't
 * fix that, since it only ever overwrites local with server data, never the other way round. Cheap
 * to call on every sign-in (small JSON PUTs) and self-heals any account whose historical pushes
 * never landed.
 *
 * Deliberately excludes crew/challenges/crew-league/led-workout — crew now has its own real,
 * genuinely shared tables/sync (see crew-store.ts's syncFromServer), and challenges/crew-league/
 * led-workout are still per-account only, same as before. Profile level also has its own dedicated
 * sync now (profile-level-store.ts talks to /profile-level directly) so it doesn't need flushing
 * through the generic blob here either.
 */
export function flushLocalStateToServer(): void {
  useOnboardingStore.getState().pushAllOnboardingData();

  const activeWorkout = useActiveWorkoutStore.getState();
  pushState("active-workout", {
    startedAt: activeWorkout.startedAt,
    name: activeWorkout.name,
    notes: activeWorkout.notes,
    unit: activeWorkout.unit,
    exercises: activeWorkout.exercises,
    restEndTime: activeWorkout.restEndTime,
    restDurationSeconds: activeWorkout.restDurationSeconds,
    autoFillPreviousSet: activeWorkout.autoFillPreviousSet,
  });

  const goals = useGoalsStore.getState();
  pushState("goals", { goals: goals.goals });

  const currency = useCurrencyStore.getState();
  pushState("currency", { tokens: currency.tokens, freezeDateKeys: currency.freezeDateKeys, xpBoostActive: currency.xpBoostActive });

  const cosmetics = useCosmeticsStore.getState();
  pushState("cosmetics", { ownedTagIds: cosmetics.ownedTagIds, equippedTagId: cosmetics.equippedTagId });

  const theme = useThemeStore.getState();
  pushState("theme", { splitThemeKey: theme.splitThemeKey, purchasedThemeKeys: theme.purchasedThemeKeys });

  const trackedLifts = useTrackedLiftsStore.getState();
  pushState("tracked-lifts", { customExerciseIds: trackedLifts.customExerciseIds, removedDefaultIds: trackedLifts.removedDefaultIds });

  const customExercises = useCustomExercisesStore.getState();
  pushState("custom-exercises", { exercises: customExercises.exercises });

  const customWorkouts = useCustomWorkoutsStore.getState();
  pushState("custom-workouts", { workouts: customWorkouts.workouts });

  const favoriteExercises = useFavoriteExercisesStore.getState();
  pushState("favorite-exercises", { favoriteIds: favoriteExercises.favoriteIds });

  const workoutNotes = useWorkoutNotesStore.getState();
  pushState("workout-notes", { notesByDate: workoutNotes.notesByDate });

  const todayTraining = useTodayTrainingStore.getState();
  pushState("today-training", { overrideDate: todayTraining.overrideDate, overrideWorkoutName: todayTraining.overrideWorkoutName });

  const notifications = useNotificationsStore.getState();
  pushState("notifications", { readIds: notifications.readIds });

  const workoutSplit = useWorkoutSplitStore.getState();
  pushState("workout-split", { preferences: workoutSplit.preferences, plan: workoutSplit.plan, acceptedAt: workoutSplit.acceptedAt });
}
