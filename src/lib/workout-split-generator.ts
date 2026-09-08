import { ALL_TEMPLATES } from "@/data/workout-templates";
import type { Exercise, ExerciseLevel } from "@/data/exercises";
import { EXERCISE_BY_ID, EXERCISE_LIBRARY } from "@/data/exercises";
import { WEEKDAYS, type Weekday } from "@/data/weekdays";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel, resolveMuscleGroup } from "@/lib/muscle-groups";
import { MUSCLE_RECOVERY_HOURS } from "@/lib/muscle-recovery";
import { RANK_TIERS, type RankTier } from "@/lib/rank";
import type { MuscleGroupRank } from "@/lib/muscle-group-rank";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type TargetMode = "balanced" | "target-rank" | "custom";
export type TrainingStyle = "ppl" | "upper-lower" | "bro-split" | "full-body" | "no-preference";
/** Local to this feature only — onboarding's own `experienceLevel` is unrelated free text. */
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type SplitPreferences = {
  targetMode: TargetMode;
  targetTier?: RankTier;
  customTargets?: Partial<Record<MuscleGroup, RankTier>>;
  trainingDays: Weekday[];
  sessionLengthMinutes: number;
  style: TrainingStyle;
  /** Subset of EXERCISE_EQUIPMENT_OPTIONS. Empty means "no restriction" (every exercise allowed). */
  equipment: string[];
  experience: ExperienceLevel;
  preferredSets: number;
  /** The user's own rep target, entered directly (not picked from a preset category) — e.g. 8-12.
   * A single number is `repsMin === repsMax`. */
  repsMin: number;
  repsMax: number;
  /** Also entered directly — how long the user actually rests between sets. */
  restSecondsBetweenSets: number;
};

export type MuscleGroupPriority = {
  group: MuscleGroup;
  /** -1 for "insufficient-data" — always reads as furthest behind. */
  currentTierIndex: number;
  targetTierIndex: number;
  rankGap: number;
  weaknessFactor: number;
  stagnationFactor: number;
  priorityScore: number;
  /** How many times/week this group *should* appear, before the real schedule's weak-point cap
   * (see assignMuscleGroupsToDays) may trim it back. Drives the UI's "you'll hit this 3x" copy. */
  weeklyExposures: 1 | 2 | 3;
};

export type GeneratedDay = {
  weekday: Weekday;
  name: string;
  focusGroups: MuscleGroup[];
  exerciseIds: string[];
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
};

/** One scannable row for the "why" section — the UI renders this as badges + a number, not prose,
 * so the whole point lands in one glance (see ranks-split reveal screen). */
export type ExplanationEntry = {
  group: MuscleGroup;
  /** -1 = unranked. */
  currentTierIndex: number;
  targetTierIndex: number;
  /** The actual realized count in the generated schedule (not just the priority's raw target). */
  weeklyExposures: number;
};

export type GeneratedPlan = {
  days: GeneratedDay[];
  priorities: MuscleGroupPriority[];
  explanation: ExplanationEntry[];
  missionSummary: {
    currentTierSpread: [MuscleGroup, number][];
    targetTierSpread: [MuscleGroup, number][];
    potentialRankUps: number;
  };
};

/* ------------------------------------------------------------------------ */
/* 1. Priority scoring                                                       */
/* ------------------------------------------------------------------------ */

function computeReferenceIndices(ranksByGroup: Partial<Record<MuscleGroup, MuscleGroupRank>>): { avgTierIndex: number; maxTierIndex: number } {
  const rankedIndices = ALL_MUSCLE_GROUPS.map((group) => ranksByGroup[group]).filter(
    (rank): rank is Extract<MuscleGroupRank, { status: "ranked" }> => rank?.status === "ranked",
  ).map((rank) => rank.tierIndex);
  if (rankedIndices.length === 0) return { avgTierIndex: 0, maxTierIndex: 0 };
  const avgTierIndex = rankedIndices.reduce((sum, index) => sum + index, 0) / rankedIndices.length;
  const maxTierIndex = Math.max(...rankedIndices);
  return { avgTierIndex, maxTierIndex };
}

function resolveTargetTierIndex(
  group: MuscleGroup,
  currentTierIndex: number,
  refs: { avgTierIndex: number; maxTierIndex: number },
  prefs: SplitPreferences,
): number {
  // A chosen target is always a *floor*, never a ceiling — a group already past it keeps its own
  // (higher) tier as its target. Different muscle groups respond to training at different rates and
  // often sit at genuinely different tiers already; forcing every single one down to the exact same
  // absolute number would both look wrong (a muscle's "target" reading lower than where it already
  // is) and erase that real variation instead of accounting for it.
  if (prefs.targetMode === "target-rank" && prefs.targetTier) return Math.max(currentTierIndex, RANK_TIERS.indexOf(prefs.targetTier));
  if (prefs.targetMode === "custom") {
    const customTier = prefs.customTargets?.[group];
    if (customTier) return Math.max(currentTierIndex, RANK_TIERS.indexOf(customTier));
  }
  // "balanced" (and any custom/target-rank group left unset) — bring it at least up to the
  // strongest group's tier, never down.
  return Math.max(currentTierIndex, refs.maxTierIndex);
}

/** A group counts as "meaningfully trained" that session at the same load floor
 * `templateMuscleIntensity` (workout-templates.ts) treats as a real primary-muscle hit. */
const MEANINGFUL_INTENSITY_THRESHOLD = 3;
const STAGNATION_WEEKS_CAP = 8;
const STAGNATION_RATE_PER_WEEK = 0.15;

export function computeStagnationFactor(group: MuscleGroup, completedWorkouts: CompletedWorkout[], now: number = Date.now()): number {
  const lastTrained = completedWorkouts.find((workout) => (workout.muscleIntensity[group] ?? 0) >= MEANINGFUL_INTENSITY_THRESHOLD);
  const weeksSince = lastTrained ? Math.max(0, (now - lastTrained.completedAt) / (7 * 86400000)) : STAGNATION_WEEKS_CAP;
  return 1 + Math.min(STAGNATION_WEEKS_CAP, weeksSince) * STAGNATION_RATE_PER_WEEK;
}

/**
 * A real priority score per muscle group — `rankGap × weaknessFactor × stagnationFactor` — plus a
 * desired weekly exposure bucket (top scorers 3x, next tier 2x, everyone else 1x maintenance).
 * `weeklyExposures` here is the *target*; `assignMuscleGroupsToDays` may not fully realize it once
 * the real schedule's weak-point cap (≤ ~40% of total training slots) is applied.
 */
export function computePriorities(
  ranksByGroup: Partial<Record<MuscleGroup, MuscleGroupRank>>,
  completedWorkouts: CompletedWorkout[],
  prefs: SplitPreferences,
  now: number = Date.now(),
): MuscleGroupPriority[] {
  const refs = computeReferenceIndices(ranksByGroup);

  const priorities: MuscleGroupPriority[] = ALL_MUSCLE_GROUPS.map((group) => {
    const rank = ranksByGroup[group];
    const currentTierIndex = rank?.status === "ranked" ? rank.tierIndex : -1;
    const targetTierIndex = resolveTargetTierIndex(group, currentTierIndex, refs, prefs);
    const rankGap = Math.max(0, targetTierIndex - currentTierIndex);
    const weaknessFactor = 1 + Math.max(0, refs.avgTierIndex - currentTierIndex) * 0.2;
    const stagnationFactor = computeStagnationFactor(group, completedWorkouts, now);
    const priorityScore = rankGap * weaknessFactor * stagnationFactor;
    return { group, currentTierIndex, targetTierIndex, rankGap, weaknessFactor, stagnationFactor, priorityScore, weeklyExposures: 1 as 1 | 2 | 3 };
  });

  const rankedByScore = [...priorities].filter((p) => p.priorityScore > 0).sort((a, b) => b.priorityScore - a.priorityScore);
  rankedByScore.forEach((priority, index) => {
    priority.weeklyExposures = index < 2 ? 3 : index < 5 ? 2 : 1;
  });

  return priorities;
}

/* ------------------------------------------------------------------------ */
/* 2. Style archetype + day assignment                                       */
/* ------------------------------------------------------------------------ */

export function pickStyleArchetype(prefs: SplitPreferences): Exclude<TrainingStyle, "no-preference"> {
  if (prefs.style !== "no-preference") return prefs.style;
  const days = prefs.trainingDays.length;
  if (days <= 3) return "full-body";
  if (days === 4) return "upper-lower";
  if (days === 5) return "ppl";
  return "bro-split";
}

type ArchetypeDayShape = { groups: MuscleGroup[]; templateKey: string | null };

/** Base weekly shape per archetype — the "normal training" skeleton, before any weak-point extras
 * get layered on top (see assignMuscleGroupsToDays). `templateKey` matches a real
 * data/workout-templates.ts `WorkoutTemplate.key` when the group set cleanly maps to one of its
 * curated exercise lists; `null` means the day's exercises are built fresh from the library. */
const ARCHETYPE_DAY_SHAPES: Record<Exclude<TrainingStyle, "no-preference">, ArchetypeDayShape[]> = {
  ppl: [
    { groups: ["chest", "shoulders", "triceps"], templateKey: "push" },
    { groups: ["back", "biceps"], templateKey: "pull" },
    { groups: ["quads", "hamstrings", "glutes", "calves"], templateKey: "legs" },
  ],
  "upper-lower": [
    { groups: ["chest", "shoulders", "triceps", "back", "biceps"], templateKey: "upper" },
    { groups: ["quads", "hamstrings", "glutes", "calves"], templateKey: "lower" },
  ],
  "full-body": [
    { groups: ["chest", "back", "quads"], templateKey: "fullBodyA" },
    { groups: ["shoulders", "hamstrings", "glutes"], templateKey: null },
    { groups: ["triceps", "biceps", "calves"], templateKey: null },
  ],
  "bro-split": [
    { groups: ["chest"], templateKey: "chest" },
    { groups: ["back"], templateKey: "back" },
    { groups: ["shoulders"], templateKey: "shoulders" },
    { groups: ["quads", "hamstrings", "glutes", "calves"], templateKey: "legs" },
    { groups: ["biceps", "triceps"], templateKey: "arms" },
  ],
};

/** Weak-point extras may add at most this fraction of the week's *natural* (baseline) day-group
 * assignments — the real, schedule-level enforcement of "60-70% normal training, 30-40% weak-point
 * emphasis" (never turn the whole week into one muscle). */
const WEAK_POINT_EXTRA_RATIO = 0.4 / 0.6;

/** Minimum whole calendar days that must separate two training days for the *same* muscle group,
 * derived directly from `MUSCLE_RECOVERY_HOURS` (lib/muscle-recovery.ts) — the same real, cited
 * recovery data the workout summary and body-graph recovery toggle show. E.g. back's 72h window
 * means at least 3 days between back-focused sessions, not just "not literally tomorrow." Abs's 24h
 * window rounds down to a 1-day minimum, which is already guaranteed between any two distinct
 * training days — so it stays effectively unrestricted, same as before, without needing a
 * special-cased exemption. */
const MIN_RECOVERY_DAY_GAP: Record<MuscleGroup, number> = Object.fromEntries(
  ALL_MUSCLE_GROUPS.map((group) => [group, Math.max(1, Math.ceil(MUSCLE_RECOVERY_HOURS[group] / 24))]),
) as Record<MuscleGroup, number>;

type DayPlan = { weekday: Weekday; shape: ArchetypeDayShape | null; groups: Set<MuscleGroup>; naturalGroups: MuscleGroup[]; extraGroups: MuscleGroup[] };

function orderedTrainingDays(trainingDays: Weekday[]): Weekday[] {
  return WEEKDAYS.filter((day) => trainingDays.includes(day));
}

/** Forward calendar-day distance from `from` to `to`, wrapping through the week (e.g. Friday →
 * Monday is 3, not negative) — always in `[1, 7]` for two distinct weekdays, since the split repeats
 * weekly. */
function calendarDayGap(from: Weekday, to: Weekday): number {
  const diff = (WEEKDAYS.indexOf(to) - WEEKDAYS.indexOf(from) + WEEKDAYS.length) % WEEKDAYS.length;
  return diff === 0 ? WEEKDAYS.length : diff;
}

/** Whether training `group` on `candidateDay` would land inside another already-placed session's
 * real recovery window for that same group — checked both forward and backward around the weekly
 * cycle (so a Friday/Monday pair is checked as 3 days apart, not treated as unrelated just because
 * they're not calendar-adjacent). */
function violatesRecovery(group: MuscleGroup, candidateDay: Weekday, plans: DayPlan[]): boolean {
  const minGap = MIN_RECOVERY_DAY_GAP[group];
  return plans.some((plan) => {
    if (plan.weekday === candidateDay || !plan.groups.has(group)) return false;
    return Math.min(calendarDayGap(plan.weekday, candidateDay), calendarDayGap(candidateDay, plan.weekday)) < minGap;
  });
}

function shapeViolatesRecovery(groups: MuscleGroup[], candidateDay: Weekday, plans: DayPlan[]): boolean {
  return groups.some((group) => violatesRecovery(group, candidateDay, plans));
}

/** The first shape (starting from `preferredIndex`, wrapping through the rest) where none of its
 * muscle groups would violate a real recovery window against any day already in `plans`. Falls back
 * to the preferred shape if every option conflicts — e.g. a 2-shape archetype (upper/lower) at an
 * odd training-day count can leave one residual conflict no reordering can fully avoid, the same
 * reason a 2-coloring of an odd cycle graph is impossible. */
function pickNonConflictingShape(shapes: ArchetypeDayShape[], preferredIndex: number, candidateDay: Weekday, plans: DayPlan[]): ArchetypeDayShape {
  for (let offset = 0; offset < shapes.length; offset++) {
    const candidate = shapes[(preferredIndex + offset) % shapes.length];
    if (!shapeViolatesRecovery(candidate.groups, candidateDay, plans)) return candidate;
  }
  return shapes[preferredIndex % shapes.length];
}

/**
 * Lays out which muscle groups land on which training day: an archetype skeleton first (the
 * "normal training" baseline), then weak-point groups (by priority) get extra exposures layered on
 * top — capped so extras never dominate the week. A muscle group is never scheduled again before its
 * real recovery window (MUSCLE_RECOVERY_HOURS) has passed, checked around the full weekly cycle
 * (including the week wrapping around, e.g. training back on both Friday and the following Monday).
 */
function assignMuscleGroupsToDays(priorities: MuscleGroupPriority[], trainingDays: Weekday[], style: Exclude<TrainingStyle, "no-preference">): DayPlan[] {
  const orderedDays = orderedTrainingDays(trainingDays);
  const shapes = ARCHETYPE_DAY_SHAPES[style];
  if (orderedDays.length === 0 || shapes.length === 0) return [];

  const plans: DayPlan[] = orderedDays.map((weekday) => ({ weekday, shape: null, groups: new Set<MuscleGroup>(), naturalGroups: [], extraGroups: [] }));

  // Pass 1: assign each day's base archetype shape in calendar order, skipping to the next shape
  // (cycling through the archetype's mutually exclusive muscle-group sets) whenever the preferred
  // one would violate a real recovery window against any day already placed so far.
  for (let index = 0; index < orderedDays.length; index++) {
    const shape = pickNonConflictingShape(shapes, index, orderedDays[index], plans);
    plans[index].shape = shape;
    plans[index].groups = new Set(shape.groups);
    plans[index].naturalGroups = [...shape.groups];
  }

  // Pass 2: the wraparound repair. Pass 1 only ever checks a day against days placed *before* it, so
  // the last training day(s) never got a chance to avoid conflicting with the first ones once the
  // week wraps back around. Re-validate every day against the full week and re-pick any that still
  // violates a real recovery window.
  for (let index = 0; index < plans.length; index++) {
    if (!shapeViolatesRecovery(plans[index].naturalGroups, plans[index].weekday, plans)) continue;
    const shape = pickNonConflictingShape(shapes, index, plans[index].weekday, plans);
    plans[index].shape = shape;
    plans[index].groups = new Set(shape.groups);
    plans[index].naturalGroups = [...shape.groups];
  }

  // Abs always joins whichever day currently carries the fewest groups — its 24h recovery window
  // never binds between two distinct training days, so (as with the old convention) it tolerates
  // frequent training and can safely tag along wherever there's room.
  const leastLoaded = plans.reduce((min, plan) => (plan.groups.size < min.groups.size ? plan : min), plans[0]);
  leastLoaded.groups.add("abs");
  leastLoaded.naturalGroups.push("abs");

  const naturalCount = new Map<MuscleGroup, number>();
  for (const plan of plans) {
    for (const group of plan.naturalGroups) naturalCount.set(group, (naturalCount.get(group) ?? 0) + 1);
  }

  const totalNaturalSlots = plans.reduce((sum, plan) => sum + plan.naturalGroups.length, 0);
  let extraBudget = Math.floor(totalNaturalSlots * WEAK_POINT_EXTRA_RATIO);

  const needsExtra = priorities
    .filter((p) => p.priorityScore > 0 && p.weeklyExposures > (naturalCount.get(p.group) ?? 0))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  for (const priority of needsExtra) {
    let needed = priority.weeklyExposures - (naturalCount.get(priority.group) ?? 0);
    for (let i = 0; i < plans.length && needed > 0 && extraBudget > 0; i++) {
      const plan = plans[i];
      if (plan.groups.has(priority.group)) continue;
      if (violatesRecovery(priority.group, plan.weekday, plans)) continue;
      plan.groups.add(priority.group);
      plan.extraGroups.push(priority.group);
      needed -= 1;
      extraBudget -= 1;
    }
  }

  return plans;
}

/* ------------------------------------------------------------------------ */
/* 3. Exercise selection                                                     */
/* ------------------------------------------------------------------------ */

const EXPERIENCE_ALLOWED_LEVELS: Record<ExperienceLevel, ExerciseLevel[]> = {
  beginner: ["beginner"],
  intermediate: ["beginner", "intermediate"],
  advanced: ["beginner", "intermediate", "expert"],
};

function equipmentAllowed(exercise: Exercise, equipment: string[]): boolean {
  if (equipment.length === 0) return true; // no restriction chosen — allow everything
  if (exercise.equipment === null || exercise.equipment === "body only") return true;
  return equipment.includes(exercise.equipment);
}

function candidatesForGroup(group: MuscleGroup, prefs: Pick<SplitPreferences, "equipment" | "experience">, excludeIds: Set<string>): Exercise[] {
  const allowedLevels = EXPERIENCE_ALLOWED_LEVELS[prefs.experience];
  const matches = (requireEquipment: boolean) =>
    EXERCISE_LIBRARY.filter(
      (exercise) =>
        !excludeIds.has(exercise.id) &&
        exercise.category === "strength" &&
        resolveMuscleGroup(exercise.primaryMuscles[0] ?? "") === group &&
        allowedLevels.includes(exercise.level) &&
        (!requireEquipment || equipmentAllowed(exercise, prefs.equipment)),
    ).sort((a, b) => a.name.localeCompare(b.name));

  const withEquipmentFilter = matches(true);
  // Equipment too restrictive for this group entirely — fall back to bodyweight-only options
  // rather than silently dropping the focus group from the day.
  if (withEquipmentFilter.length > 0) return withEquipmentFilter;
  return matches(false).filter((exercise) => exercise.equipment === null || exercise.equipment === "body only");
}

const SECONDS_PER_REP = 3; // a controlled, unhurried tempo — not a race, not a pause between reps
const TRANSITION_SECONDS_PER_EXERCISE = 90; // walking to the next station, adjusting a machine, etc.
const MIN_EXERCISES_PER_DAY = 3;
const MAX_EXERCISES_PER_DAY = 10;

/** How many exercises the chosen session length can physically fit, given the user's own sets,
 * reps and rest — every number here is the user's own input, not a preset category, so this moves
 * with whatever they actually told us they do in the gym. This is a *ceiling*: the real per-day
 * count (see naturalExerciseNeed below) is usually lower, since how many groups a day actually
 * trains matters more than how much raw time is available. */
function exercisesPerSessionFor(sessionLengthMinutes: number, preferredSets: number, repsMin: number, repsMax: number, restSecondsBetweenSets: number): number {
  const avgReps = (repsMin + repsMax) / 2;
  const secondsPerSet = avgReps * SECONDS_PER_REP + restSecondsBetweenSets;
  const secondsPerExercise = preferredSets * secondsPerSet + TRANSITION_SECONDS_PER_EXERCISE;
  const sessionSeconds = sessionLengthMinutes * 60;
  return Math.max(MIN_EXERCISES_PER_DAY, Math.min(MAX_EXERCISES_PER_DAY, Math.round(sessionSeconds / secondsPerExercise)));
}

/**
 * How many exercises this specific day actually calls for — a template day keeps its curator's own
 * count (e.g. "Push Day" is 5 exercises because that's what covers chest/shoulders/triceps well,
 * not because of a time formula); a synthesized day needs roughly one exercise per group it trains.
 * Extra weak-point focus groups count double — they're getting genuine added volume, not just a
 * mention. This is why two different days in the same split can (and should) end up with different
 * exercise counts, rather than every day being force-filled to the same number.
 */
function naturalExerciseNeed(plan: DayPlan): number {
  const templateCount = plan.shape?.templateKey ? (ALL_TEMPLATES.find((t) => t.key === plan.shape!.templateKey)?.exerciseIds.length ?? 0) : 0;
  const baseline = Math.max(templateCount, plan.naturalGroups.length);
  return baseline + plan.extraGroups.length * 2;
}

/**
 * Fills the day's exercise list up to `min(naturalExerciseNeed, timeCeiling)` — how many exercises
 * this specific day actually calls for, never more than the session length can fit. Fill order is
 * priority order: weak-point extra-focus groups claim their slots first (they're the actual reason
 * this group landed on this day), then the day's curated template (if any) fills the rest, then any
 * remaining natural group the template didn't cover gets one fallback pick. A tight budget (short
 * session, or a day with few groups) trims from the bottom of that order — never silently drops the
 * extra-focus exercises a longer template list would otherwise crowd out.
 */
function selectExercisesForDay(plan: DayPlan, prefs: SplitPreferences): string[] {
  const timeCeiling = exercisesPerSessionFor(prefs.sessionLengthMinutes, prefs.preferredSets, prefs.repsMin, prefs.repsMax, prefs.restSecondsBetweenSets);
  const budget = Math.max(MIN_EXERCISES_PER_DAY, Math.min(timeCeiling, naturalExerciseNeed(plan)));
  const exerciseIds: string[] = [];
  const usedIds = new Set<string>();
  const coveredGroups = new Set<MuscleGroup>();

  function addExercise(id: string, group: MuscleGroup | null): void {
    if (exerciseIds.length >= budget || usedIds.has(id)) return;
    exerciseIds.push(id);
    usedIds.add(id);
    if (group) coveredGroups.add(group);
  }

  for (const group of plan.extraGroups) {
    if (exerciseIds.length >= budget) break;
    const candidates = candidatesForGroup(group, prefs, usedIds);
    for (const exercise of candidates.slice(0, 2)) {
      if (exerciseIds.length >= budget) break;
      addExercise(exercise.id, group);
    }
  }

  if (plan.shape?.templateKey) {
    const template = ALL_TEMPLATES.find((t) => t.key === plan.shape!.templateKey);
    if (template) {
      for (const id of template.exerciseIds) {
        if (exerciseIds.length >= budget) break;
        const exercise = EXERCISE_BY_ID[id];
        if (!exercise || !equipmentAllowed(exercise, prefs.equipment)) continue;
        const group = resolveMuscleGroup(exercise.primaryMuscles[0] ?? "");
        if (group && coveredGroups.has(group)) continue;
        addExercise(id, group);
      }
    }
  }

  for (const group of plan.naturalGroups) {
    if (exerciseIds.length >= budget) break;
    if (coveredGroups.has(group)) continue;
    const exercise = candidatesForGroup(group, prefs, usedIds)[0];
    if (exercise) addExercise(exercise.id, group);
  }

  // Top up to the full budget — a chosen session length is a real input, not just a ceiling, so a
  // day should actually cost roughly that long, not stop short once the template/priority passes
  // run out. Cycles through the day's own focus groups adding one more exercise each pass, until
  // the budget is filled or this day genuinely has no more distinct candidates left to add.
  let addedThisPass = true;
  while (exerciseIds.length < budget && addedThisPass) {
    addedThisPass = false;
    for (const group of plan.groups) {
      if (exerciseIds.length >= budget) break;
      const exercise = candidatesForGroup(group, prefs, usedIds)[0];
      if (exercise) {
        addExercise(exercise.id, group);
        addedThisPass = true;
      }
    }
  }

  return exerciseIds;
}

function computeMuscleIntensityForExerciseIds(exerciseIds: string[]): Partial<Record<MuscleGroup, number>> {
  const intensity: Partial<Record<MuscleGroup, number>> = {};
  for (const id of exerciseIds) {
    const exercise = EXERCISE_BY_ID[id];
    if (!exercise) continue;
    for (const muscleName of exercise.primaryMuscles) {
      const group = resolveMuscleGroup(muscleName);
      if (group) intensity[group] = Math.min(10, (intensity[group] ?? 0) + 3);
    }
    for (const muscleName of exercise.secondaryMuscles) {
      const group = resolveMuscleGroup(muscleName);
      if (group) intensity[group] = Math.min(10, (intensity[group] ?? 0) + 1);
    }
  }
  return intensity;
}

function nameForDay(plan: DayPlan): string {
  const baseName = plan.shape?.templateKey
    ? (ALL_TEMPLATES.find((t) => t.key === plan.shape!.templateKey)?.name ?? synthesizedName(plan.naturalGroups))
    : synthesizedName(plan.naturalGroups);
  if (plan.extraGroups.length === 0) return baseName;
  return `${baseName} + ${plan.extraGroups.map(formatMuscleLabel).join(" & ")} Focus`;
}

function synthesizedName(groups: MuscleGroup[]): string {
  const labels = groups.filter((g) => g !== "abs").slice(0, 2);
  return `${labels.map(formatMuscleLabel).join(" & ") || "Full Body"} Day`;
}

/* ------------------------------------------------------------------------ */
/* 4. Explanation + mission                                                  */
/* ------------------------------------------------------------------------ */

const EXPLANATION_ROW_COUNT = 4;

/** Structured rows, not sentences — the reveal screen renders each as badges + a number so the
 * whole point ("this muscle, this gap, this many sessions") lands in one glance instead of needing
 * to be read. */
function buildExplanation(priorities: MuscleGroupPriority[], days: GeneratedDay[]): ExplanationEntry[] {
  const exposureByGroup = new Map<MuscleGroup, number>();
  for (const day of days) {
    for (const group of day.focusGroups) exposureByGroup.set(group, (exposureByGroup.get(group) ?? 0) + 1);
  }

  return [...priorities]
    .filter((p) => p.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, EXPLANATION_ROW_COUNT)
    .map((priority) => ({
      group: priority.group,
      currentTierIndex: priority.currentTierIndex,
      targetTierIndex: priority.targetTierIndex,
      weeklyExposures: exposureByGroup.get(priority.group) ?? 1,
    }));
}

function buildMissionSummary(priorities: MuscleGroupPriority[]): GeneratedPlan["missionSummary"] {
  return {
    currentTierSpread: priorities.map((p) => [p.group, p.currentTierIndex] as [MuscleGroup, number]),
    targetTierSpread: priorities.map((p) => [p.group, p.targetTierIndex] as [MuscleGroup, number]),
    potentialRankUps: priorities.filter((p) => p.rankGap > 0).length,
  };
}

/* ------------------------------------------------------------------------ */
/* 5. Orchestration                                                          */
/* ------------------------------------------------------------------------ */

export function generateWorkoutSplit(
  ranksByGroup: Partial<Record<MuscleGroup, MuscleGroupRank>>,
  completedWorkouts: CompletedWorkout[],
  prefs: SplitPreferences,
): GeneratedPlan {
  const priorities = computePriorities(ranksByGroup, completedWorkouts, prefs);
  const style = pickStyleArchetype(prefs);
  const dayPlans = assignMuscleGroupsToDays(priorities, prefs.trainingDays, style);

  const days: GeneratedDay[] = dayPlans.map((plan) => {
    const exerciseIds = selectExercisesForDay(plan, prefs);
    return {
      weekday: plan.weekday,
      name: nameForDay(plan),
      focusGroups: [...plan.groups],
      exerciseIds,
      muscleIntensity: computeMuscleIntensityForExerciseIds(exerciseIds),
    };
  });

  return {
    days,
    priorities,
    explanation: buildExplanation(priorities, days),
    missionSummary: buildMissionSummary(priorities),
  };
}
