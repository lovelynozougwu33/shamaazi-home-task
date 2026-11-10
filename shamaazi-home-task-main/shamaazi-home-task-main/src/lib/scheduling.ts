import { addDays, addMonths, getDay, setDate, startOfDay } from 'date-fns';

/** Next calendar date (UTC midnight) for a weekly cadence, on or after `from`. */
export function firstWeeklyOnOrAfter(from: Date, dayOfWeek: number): Date {
  const base = startOfDay(from);
  const delta = (dayOfWeek - getDay(base) + 7) % 7;
  return addDays(base, delta);
}

/** Next occurrence after a completed weekly donation (same weekday, +7 days). */
export function nextWeeklyOccurrence(lastOccurrence: Date): Date {
  return addDays(startOfDay(lastOccurrence), 7);
}

/** First monthly occurrence on or after `from` (day 1–28). */
export function firstMonthlyOnOrAfter(from: Date, dayOfMonth: number): Date {
  const safeDom = Math.min(dayOfMonth, 28);
  const base = startOfDay(from);
  let candidate = setDate(base, safeDom);
  if (candidate < base) {
    candidate = setDate(addMonths(base, 1), safeDom);
  }
  return candidate;
}

/** Next month’s occurrence after a processed monthly donation. */
export function nextMonthlyOccurrence(lastOccurrence: Date, dayOfMonth: number): Date {
  const safeDom = Math.min(dayOfMonth, 28);
  const d = addMonths(startOfDay(lastOccurrence), 1);
  return setDate(d, safeDom);
}
