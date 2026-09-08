/** Matches backend/routes/crew-wars.php's ATTACK_PR_BONUS exactly. `attack()` in crew-war-store.ts
 * is fire-and-forget (a workout shouldn't wait on a network round trip to finish), so this lets the
 * summary screen show the War-attack score instantly instead of waiting for that call to resolve. */
export const WAR_ATTACK_PR_BONUS = 250;

export function warAttackScore(volumeKg: number, prCount: number): number {
  return Math.round(volumeKg + prCount * WAR_ATTACK_PR_BONUS);
}
