/** True when `current` is an older version than `minimum` — compared number by number, so "1.10.0"
 * is newer than "1.9.0" (a plain string comparison gets that wrong). Missing parts count as 0. */
export function isOlderVersion(current: string, minimum: string): boolean {
  const a = current.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
