/**
 * The single ladder both crews and individual players climb — 20 named tiers, ordered lowest to
 * highest. Matches the illustrated badge set in assets/images/divisions/ exactly (name + order),
 * since that artwork is the source of truth for this ladder.
 */
export const DIVISIONS = [
  "Rookie",
  "Novice",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Elite",
  "Master",
  "Grandmaster",
  "Champion",
  "Titan",
  "Mythic",
  "Immortal",
  "Legend",
  "Overlord",
  "Supreme",
  "Conqueror",
  "Dominator",
  "Apex",
] as const;

export type Division = (typeof DIVISIONS)[number];

export const DIVISION_COLOR: Record<Division, string> = {
  Rookie: "#B0A183",
  Novice: "#6FCF3D",
  Bronze: "#CD7F32",
  Silver: "#9FB4C7",
  Gold: "#FFD700",
  Platinum: "#4FD1C5",
  Diamond: "#4FC3F7",
  Elite: "#9B6DFF",
  Master: "#FF5252",
  Grandmaster: "#A855F7",
  Champion: "#FF7043",
  Titan: "#8E8E99",
  Mythic: "#C084FC",
  Immortal: "#FFD54F",
  Legend: "#FFB300",
  Overlord: "#C2185B",
  Supreme: "#4DD0E1",
  Conqueror: "#FF6D00",
  Dominator: "#7B1FA2",
  Apex: "#FFD700",
};

/**
 * XP needed to climb OUT of each division (i.e. from "Rookie" to "Novice" takes 500 XP). Growth is
 * roughly ×1.44 per tier, so the ladder starts easy and gets meaningfully harder near the top —
 * intentional, so not every crew ends up maxed out. Apex has no next tier, so its value is unused.
 */
const DIVISION_XP_REQUIRED: Record<Division, number> = {
  Rookie: 500,
  Novice: 750,
  Bronze: 1100,
  Silver: 1600,
  Gold: 2300,
  Platinum: 3300,
  Diamond: 4700,
  Elite: 6700,
  Master: 9600,
  Grandmaster: 13800,
  Champion: 19800,
  Titan: 28500,
  Mythic: 41000,
  Immortal: 59000,
  Legend: 85000,
  Overlord: 122000,
  Supreme: 176000,
  Conqueror: 253000,
  Dominator: 364000,
  Apex: Infinity,
};

export function divisionIndex(division: string): number {
  return DIVISIONS.indexOf(division as Division);
}

export function isValidDivision(division: string): division is Division {
  return divisionIndex(division) !== -1;
}

export function xpRequiredFor(division: string): number {
  return DIVISION_XP_REQUIRED[division as Division] ?? DIVISION_XP_REQUIRED.Rookie;
}

/** The next division up, or `null` if already at the top (Apex). */
export function nextDivision(division: string): Division | null {
  const index = divisionIndex(division);
  if (index === -1 || index === DIVISIONS.length - 1) return null;
  return DIVISIONS[index + 1];
}

export type DivisionAdvanceResult = {
  xp: number;
  division: Division;
  /** True if `division` moved up at least one tier — the caller should show a celebration. */
  leveledUp: boolean;
  from: Division;
  to: Division;
};

/**
 * Shared XP-application logic for both the crew ladder and the personal profile ladder: adds XP,
 * rolling over into however many divisions it covers (a huge XP grant could jump more than one
 * tier), and reports whether — and how far — it climbed so the caller can trigger a celebration.
 */
export function advanceDivision(currentXp: number, currentDivision: Division, xpGained: number): DivisionAdvanceResult {
  let xp = currentXp + xpGained;
  let division = currentDivision;
  let next = nextDivision(division);

  while (next && xp >= xpRequiredFor(division)) {
    xp -= xpRequiredFor(division);
    division = next;
    next = nextDivision(division);
  }
  if (!next) xp = Math.min(xp, xpRequiredFor(division)); // Apex has no bar left to fill

  return { xp, division, leveledUp: division !== currentDivision, from: currentDivision, to: division };
}

/**
 * Absolute individual-player "power" cutoffs for the Global leaderboard's division grouping —
 * unlike the crew ladder (relative XP per tier), a player's power score is already an absolute
 * number, so divisions here are fixed thresholds on that scale. Top tiers are deliberately out of
 * reach of today's mock leaderboard — nobody's climbed that far yet.
 */
const PLAYER_DIVISION_MIN_POWER: Record<Division, number> = {
  Rookie: 0,
  Novice: 800,
  Bronze: 1700,
  Silver: 2800,
  Gold: 4000,
  Platinum: 5300,
  Diamond: 6700,
  Elite: 8200,
  Master: 9800,
  Grandmaster: 11500,
  Champion: 13400,
  Titan: 15500,
  Mythic: 17800,
  Immortal: 20400,
  Legend: 23400,
  Overlord: 26800,
  Supreme: 30700,
  Conqueror: 35200,
  Dominator: 40400,
  Apex: 46500,
};

export function divisionForPlayerPower(power: number): Division {
  let result: Division = "Rookie";
  for (const division of DIVISIONS) {
    if (power >= PLAYER_DIVISION_MIN_POWER[division]) result = division;
    else break;
  }
  return result;
}

/**
 * Absolute crew-power cutoffs for the "Crews" leaderboard's division grouping — crew power runs
 * roughly an order of magnitude above individual player power (see data/crew-leaderboard.ts), so
 * this uses its own scale rather than sharing the player thresholds above.
 */
const CREW_DIVISION_MIN_POWER: Record<Division, number> = {
  Rookie: 0,
  Novice: 2500,
  Bronze: 5500,
  Silver: 9500,
  Gold: 14500,
  Platinum: 20500,
  Diamond: 24000,
  Elite: 27000,
  Master: 33000,
  Grandmaster: 40000,
  Champion: 48500,
  Titan: 59000,
  Mythic: 72000,
  Immortal: 88000,
  Legend: 107000,
  Overlord: 130000,
  Supreme: 158000,
  Conqueror: 192000,
  Dominator: 233000,
  Apex: 283000,
};

export function divisionForCrewPower(power: number): Division {
  let result: Division = "Rookie";
  for (const division of DIVISIONS) {
    if (power >= CREW_DIVISION_MIN_POWER[division]) result = division;
    else break;
  }
  return result;
}
