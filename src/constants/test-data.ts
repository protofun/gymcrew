/** Id prefix on every workout / weigh-in the Developer Tools add locally (see lib/dev-tools.ts).
 * Those rows are never sent to the server; the stores' `syncFromServer` keeps them so they survive
 * an app restart until "Restore to Database State" removes them. */
export const TEST_ID_PREFIX = "dev-";

export function isTestId(id: string): boolean {
  return id.startsWith(TEST_ID_PREFIX);
}
