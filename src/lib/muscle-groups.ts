import { BACK_MUSCLES, FRONT_MUSCLES } from "@/data/body-muscle-paths";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { colors } from "@/theme";

/** Reverse lookup: an anatomical region id (e.g. "front-biceps-left-0") to its broad muscle group —
 * built straight from the body silhouette data (data/body-muscle-paths.ts), which already carries
 * each region's group, rather than hand-maintaining a second, easily-out-of-sync list of ids. */
export const MUSCLE_GROUP_BY_REGION_ID = new Map<string, MuscleGroup>();
for (const region of [...FRONT_MUSCLES, ...BACK_MUSCLES]) {
  MUSCLE_GROUP_BY_REGION_ID.set(region.id, region.group);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

// A trained muscle glows in the app's signature yellow-green — the same
// lime color as the "Start Workout" button, the XP bar, and the calendar's
// trained-day dots. Low intensity is a muted, washed-out version of it, max
// intensity is the full vivid brand yellow, so light vs. heavy training reads clearly.
const MUTED_BASE_RGB = hexToRgb(colors.neutral.textSecondary);
const ACCENT_RGB = hexToRgb(colors.brand.yellow);
const INTENSITY_LOW = mixRgb(MUTED_BASE_RGB, ACCENT_RGB, 0.35);
const INTENSITY_HIGH = ACCENT_RGB;

export function intensityToColor(intensity: number): string {
  const t = Math.max(0, Math.min(10, intensity)) / 10;
  const { r, g, b } = mixRgb(INTENSITY_LOW, INTENSITY_HIGH, t);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Crew-level muscle balance reads as low (green, needs work) → high (red, well trained),
// distinct from the single-person heatmap's yellow scale — a crew view is inherently
// comparative across muscle groups, so it borrows the familiar traffic-light convention.
const RED_GREEN_STOPS = ["#22C55E", "#EAB308", "#F97316", "#EF4444"].map(hexToRgb);

export function intensityToRedGreenColor(intensity: number): string {
  const t = Math.max(0, Math.min(10, intensity)) / 10;
  const segments = RED_GREEN_STOPS.length - 1;
  const scaled = t * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const { r, g, b } = mixRgb(RED_GREEN_STOPS[index], RED_GREEN_STOPS[index + 1], scaled - index);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function formatMuscleLabel(group: MuscleGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

/** A fixed, distinct color per muscle group — unlike the crew Stats muscle-split chart's
 * rank-position palette (MUSCLE_SPLIT_PALETTE in crew-stats.ts), this stays the same color for the
 * same muscle everywhere it appears (e.g. the training calendar), so it's learnable at a glance. */
export const MUSCLE_GROUP_COLOR: Record<MuscleGroup, string> = {
  chest: "#FF3B30",
  back: "#7C4DFF",
  shoulders: "#FFB800",
  biceps: "#00E676",
  triceps: "#FF6D00",
  abs: "#00E5FF",
  quads: "#2979FF",
  hamstrings: "#E040FB",
  calves: "#FFD600",
  glutes: "#FF4081",
};

/**
 * Maps free-exercise-db's muscle names (used by the exercise library) onto our simplified
 * `MuscleGroup` taxonomy, for feeding logged workouts into the heatmap. A few smaller muscles
 * (forearms, neck, abductors, adductors) don't have a dedicated group here, so they fold into
 * the closest broad group rather than being dropped from the heatmap entirely.
 */
const MUSCLE_GROUP_BY_LIBRARY_NAME: Record<string, MuscleGroup> = {
  chest: "chest",
  shoulders: "shoulders",
  neck: "shoulders",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  biceps: "biceps",
  forearms: "biceps",
  triceps: "triceps",
  abdominals: "abs",
  quadriceps: "quads",
  adductors: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  glutes: "glutes",
  abductors: "glutes",
};

export function toMuscleGroup(libraryMuscleName: string): MuscleGroup | null {
  return MUSCLE_GROUP_BY_LIBRARY_NAME[libraryMuscleName.toLowerCase()] ?? null;
}

const MUSCLE_GROUP_SET = new Set<string>(ALL_MUSCLE_GROUPS);

/**
 * Resolves either a free-exercise-db muscle name (e.g. "quadriceps") or an already-valid
 * `MuscleGroup` to a `MuscleGroup`, or `null` if neither matches. Custom exercises
 * (custom-exercises-store.ts) store `primaryMuscles`/`secondaryMuscles` as our own `MuscleGroup`
 * values directly rather than free-exercise-db names, so `toMuscleGroup` alone would miss a few of
 * them (e.g. "abs", "quads" — real names in our taxonomy, but not library muscle names).
 */
export function resolveMuscleGroup(name: string): MuscleGroup | null {
  return toMuscleGroup(name) ?? (MUSCLE_GROUP_SET.has(name) ? (name as MuscleGroup) : null);
}

/** Which silhouette (front vs back) best represents a training day's dominant muscles — for
 * single-view heatmap badges (e.g. the workout-split day slots) that can't show both front and
 * back at once. Weighted toward the groups each view is actually about (chest/abs → front,
 * glutes/hamstrings/back → back) rather than summing every group the body-silhouette data happens
 * to tag on both sides (e.g. a small "back" sliver is visible in the front artwork too). */
export function preferredMuscleView(muscleIntensity: Partial<Record<MuscleGroup, number>>): "front" | "back" {
  const backSignal = (muscleIntensity.back ?? 0) * 2 + (muscleIntensity.hamstrings ?? 0) + (muscleIntensity.glutes ?? 0);
  const frontSignal = (muscleIntensity.chest ?? 0) * 2 + (muscleIntensity.abs ?? 0) + (muscleIntensity.quads ?? 0);
  return backSignal > frontSignal ? "back" : "front";
}
