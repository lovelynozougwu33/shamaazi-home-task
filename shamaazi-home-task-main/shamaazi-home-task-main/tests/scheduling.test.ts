import { describe, expect, it } from 'vitest';
import {
  firstMonthlyOnOrAfter,
  firstWeeklyOnOrAfter,
  nextMonthlyOccurrence,
  nextWeeklyOccurrence,
} from '../src/lib/scheduling';

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('scheduling helpers', () => {
  it('returns the same day for weekly schedules when already on target weekday', () => {
    const from = new Date('2026-04-17T14:30:00.000Z');

    expect(ymdLocal(firstWeeklyOnOrAfter(from, 5))).toBe('2026-04-17');
  });

  it('moves to the next matching weekday for weekly schedules', () => {
    const from = new Date('2026-04-15T10:00:00.000Z');

    expect(ymdLocal(firstWeeklyOnOrAfter(from, 5))).toBe('2026-04-17');
  });

  it('keeps the current month when the monthly day has not passed', () => {
    const from = new Date('2026-04-10T09:00:00.000Z');

    expect(ymdLocal(firstMonthlyOnOrAfter(from, 20))).toBe('2026-04-20');
  });

  it('moves to the next month when the monthly day has already passed', () => {
    const from = new Date('2026-04-21T09:00:00.000Z');

    expect(ymdLocal(firstMonthlyOnOrAfter(from, 20))).toBe('2026-05-20');
  });

  it('caps monthly scheduling at day 28 to avoid invalid month-end dates', () => {
    const from = new Date('2026-04-01T09:00:00.000Z');

    expect(ymdLocal(firstMonthlyOnOrAfter(from, 31))).toBe('2026-04-28');
    expect(ymdLocal(nextMonthlyOccurrence(new Date('2026-04-28T00:00:00.000Z'), 31))).toBe(
      '2026-05-28',
    );
  });

  it('advances weekly occurrences by exactly seven days', () => {
    const from = new Date('2026-04-17T18:00:00.000Z');

    expect(ymdLocal(nextWeeklyOccurrence(from))).toBe('2026-04-24');
  });
});
