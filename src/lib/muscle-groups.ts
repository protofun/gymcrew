import type { MuscleGroup } from "@/data/workout-log";
import { colors } from "@/theme";

/** Maps our simplified workout-log muscle groups onto the body-muscles
 * package's finer-grained anatomical region ids (front + back views). */
export const MUSCLE_GROUP_IDS: Record<MuscleGroup, string[]> = {
  chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  shoulders: [
    "shoulder-front-left",
    "shoulder-front-right",
    "shoulder-side-left",
    "shoulder-side-right",
    "deltoid-rear-left",
    "deltoid-rear-right",
  ],
  back: [
    "lats-upper-left",
    "lats-mid-left",
    "lats-lower-left",
    "lats-upper-right",
    "lats-mid-right",
    "lats-lower-right",
    "traps-upper-left",
    "traps-mid-left",
    "traps-lower-left",
    "traps-upper-right",
    "traps-mid-right",
    "traps-lower-right",
    "lower-back-erectors-left",
    "lower-back-erectors-right",
    "lower-back-ql-left",
    "lower-back-ql-right",
    "spine",
  ],
  biceps: ["biceps-left", "biceps-right"],
  triceps: ["triceps-long-left", "triceps-lateral-left", "triceps-long-right", "triceps-lateral-right"],
  abs: [
    "abs-upper-left",
    "abs-upper-right",
    "abs-lower-left",
    "abs-lower-right",
    "obliques-left",
    "obliques-right",
    "serratus-anterior-left",
    "serratus-anterior-right",
  ],
  quads: ["quads-left", "quads-right", "hip-flexor-left", "hip-flexor-right"],
  hamstrings: ["hamstrings-medial-left", "hamstrings-lateral-left", "hamstrings-medial-right", "hamstrings-lateral-right"],
  calves: [
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-soleus-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "calves-soleus-right",
    "tibialis-anterior-left",
    "tibialis-anterior-right",
  ],
  glutes: ["gluteus-medius-left", "gluteus-maximus-left", "gluteus-medius-right", "gluteus-maximus-right"],
};

/** Reverse lookup: an anatomical region id (e.g. "biceps-left") to its broad muscle group. */
export const MUSCLE_GROUP_BY_REGION_ID = new Map<string, MuscleGroup>();
for (const [group, ids] of Object.entries(MUSCLE_GROUP_IDS) as [MuscleGroup, string[]][]) {
  for (const id of ids) MUSCLE_GROUP_BY_REGION_ID.set(id, group);
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
