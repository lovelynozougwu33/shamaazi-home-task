/** Maximum charge attempts per donation before terminal failure. */
export const MAX_DONATION_ATTEMPTS = 5;

/** Backoff after attempt `n` fails (0-based index into this table after first failure). */
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];

export function retryDelayMs(failureIndex: number): number {
  const idx = Math.max(0, Math.min(failureIndex, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[idx];
}

/** If a worker dies mid-charge, release the row after this long. */
export const STALE_PROCESSING_MS = 15 * 60_000;
