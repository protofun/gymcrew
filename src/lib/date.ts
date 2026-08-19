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

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** The Monday-start week containing `referenceDate`, as 7 consecutive dates. */
export function getCurrentWeekDates(referenceDate: Date): Date[] {
  const mondayOffset = (referenceDate.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

/** The date-key of the Monday starting the current week — a stable id for "this week" that's the same for every user, so weekly challenges line up across crews. */
export function currentWeekKey(referenceDate: Date = new Date()): string {
  return toDateKey(getCurrentWeekDates(referenceDate)[0]);
}

/** Monday-start month grid, padded with nulls to full weeks. */
export function getMonthGrid(monthDate: Date): (Date | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // week starts Monday

  const cells: (Date | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
