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
