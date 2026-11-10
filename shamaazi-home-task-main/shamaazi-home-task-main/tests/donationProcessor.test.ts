import { describe, expect, it } from 'vitest';
import { MAX_DONATION_ATTEMPTS, retryDelayMs, STALE_PROCESSING_MS } from '../src/constants';
import { computeInitialNextScheduledAt } from '../src/services/donationProcessor';

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('donation processor policy', () => {
  it('computes the initial weekly scheduled date from the requested weekday', () => {
    const from = new Date('2026-04-15T12:00:00.000Z');

    expect(ymdLocal(computeInitialNextScheduledAt('weekly', 5, null, from))).toBe('2026-04-17');
  });

  it('computes the initial monthly scheduled date from the requested day', () => {
    const from = new Date('2026-04-15T12:00:00.000Z');

    expect(ymdLocal(computeInitialNextScheduledAt('monthly', null, 20, from))).toBe('2026-04-20');
  });

  it('throws if cadence-specific inputs are missing', () => {
    expect(() => computeInitialNextScheduledAt('weekly', null, null)).toThrow(
      'dayOfWeek is required for weekly frequency',
    );
    expect(() => computeInitialNextScheduledAt('monthly', null, null)).toThrow(
      'dayOfMonth is required for monthly frequency',
    );
  });

  it('uses the documented retry backoff table', () => {
    expect(retryDelayMs(0)).toBe(60_000);
    expect(retryDelayMs(1)).toBe(5 * 60_000);
    expect(retryDelayMs(2)).toBe(30 * 60_000);
    expect(retryDelayMs(3)).toBe(2 * 3_600_000);
    expect(retryDelayMs(4)).toBe(6 * 3_600_000);
  });

  it('clamps retry backoff lookups beyond the configured range', () => {
    expect(retryDelayMs(-1)).toBe(60_000);
    expect(retryDelayMs(999)).toBe(6 * 3_600_000);
  });

  it('keeps retry policy guardrails explicit', () => {
    expect(MAX_DONATION_ATTEMPTS).toBe(5);
    expect(STALE_PROCESSING_MS).toBe(15 * 60_000);
  });
});
