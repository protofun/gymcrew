export const WORKOUT_XP_REWARD = 40;
export const PR_XP_BONUS = 20;

/** Same reward the finish flow (active.tsx) actually grants — shared so the results screen can
 * display "+X XP earned" without duplicating the formula. Doesn't account for an active XP boost
 * (that's applied on top, at grant time, not part of the base reward shown here). */
export function workoutXpEarned(prCount: number): number {
  return WORKOUT_XP_REWARD + prCount * PR_XP_BONUS;
}
