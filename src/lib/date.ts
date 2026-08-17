/**
 * Local-timezone `yyyy-mm-dd` key for a date. Used to compare calendar days
 * without the UTC-shift bugs `toISOString()` introduces for local dates.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `toDateKey` string back into a local midnight Date. Unlike
 * `new Date("yyyy-mm-dd")`, which the JS spec parses as UTC, this stays in
 * the same local timezone `toDateKey` used to produce the string.
 */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
