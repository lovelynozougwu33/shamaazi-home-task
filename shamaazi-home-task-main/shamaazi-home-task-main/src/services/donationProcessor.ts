import { Op, Transaction } from 'sequelize';
import { Donation, DonationStatus, RecurringSchedule } from '../models';
import { sequelize } from '../config/database';
import { MAX_DONATION_ATTEMPTS, retryDelayMs, STALE_PROCESSING_MS } from '../constants';
import type { PaymentProvider } from './payment/PaymentProvider';
import {
  firstMonthlyOnOrAfter,
  firstWeeklyOnOrAfter,
  nextMonthlyOccurrence,
  nextWeeklyOccurrence,
} from '../lib/scheduling';

const BATCH = 25;

function addMs(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

async function recoverStaleProcessing(t: Transaction, now: Date): Promise<void> {
  const threshold = new Date(now.getTime() - STALE_PROCESSING_MS);
  const stuck = await Donation.findAll({
    where: {
      status: 'processing',
      updatedAt: { [Op.lt]: threshold },
    },
    transaction: t,
    lock: Transaction.LOCK.UPDATE,
  });

  for (const row of stuck) {
    const attempts = row.attemptCount + 1;
    const err = 'processing_timeout_or_worker_crash';
    if (attempts >= MAX_DONATION_ATTEMPTS) {
      await row.update(
        {
          status: 'failed' as DonationStatus,
          attemptCount: attempts,
          lastError: err,
          processedAt: now,
        },
        { transaction: t },
      );
    } else {
      await row.update(
        {
          status: 'scheduled' as DonationStatus,
          attemptCount: attempts,
          lastError: err,
          scheduledAt: addMs(now, retryDelayMs(attempts - 1)),
        },
        { transaction: t },
      );
    }
  }
}

async function materializeRecurringDonations(t: Transaction, now: Date): Promise<void> {
  const due = await RecurringSchedule.findAll({
    where: {
      isActive: true,
      nextScheduledAt: { [Op.lte]: now },
    },
    limit: BATCH,
    transaction: t,
    lock: t.LOCK.UPDATE,
    skipLocked: true,
  });

  for (const schedule of due) {
    const occurrenceTime = schedule.nextScheduledAt;
    await Donation.create(
      {
        donorId: schedule.donorId,
        productId: schedule.productId,
        recurringScheduleId: schedule.id,
        donationType: 'recurring',
        amountGbp: schedule.amountGbp,
        status: 'scheduled',
        scheduledAt: occurrenceTime,
        attemptCount: 0,
        lastError: null,
        processedAt: null,
      },
      { transaction: t },
    );

    let next: Date;
    if (schedule.frequency === 'weekly') {
      const dow = schedule.dayOfWeek;
      if (dow === null || dow === undefined) {
        throw new Error('weekly schedule missing dayOfWeek');
      }
      next = nextWeeklyOccurrence(occurrenceTime);
    } else {
      const dom = schedule.dayOfMonth;
      if (dom === null || dom === undefined) {
        throw new Error('monthly schedule missing dayOfMonth');
      }
      next = nextMonthlyOccurrence(occurrenceTime, dom);
    }

    await schedule.update({ nextScheduledAt: next }, { transaction: t });
  }
}

async function processDueDonations(t: Transaction, now: Date, payment: PaymentProvider): Promise<void> {
  const due = await Donation.findAll({
    where: {
      status: 'scheduled',
      scheduledAt: { [Op.lte]: now },
    },
    limit: BATCH,
    transaction: t,
    lock: t.LOCK.UPDATE,
    skipLocked: true,
  });

  for (const donation of due) {
    await donation.update({ status: 'processing' }, { transaction: t });

    const amount = Number(donation.amountGbp);
    const result = await payment.charge({
      donationId: donation.id,
      donorId: donation.donorId,
      amountGbp: amount,
      currency: 'GBP',
    });

    if (result.ok) {
      await donation.update(
        {
          status: 'succeeded' as DonationStatus,
          processedAt: now,
          lastError: null,
        },
        { transaction: t },
      );
      continue;
    }

    const attempts = donation.attemptCount + 1;
    const message = `${result.errorCode}: ${result.errorMessage}`;

    if (attempts >= MAX_DONATION_ATTEMPTS) {
      await donation.update(
        {
          status: 'failed' as DonationStatus,
          attemptCount: attempts,
          lastError: message,
          processedAt: now,
        },
        { transaction: t },
      );
    } else {
      await donation.update(
        {
          status: 'scheduled' as DonationStatus,
          attemptCount: attempts,
          lastError: message,
          scheduledAt: addMs(now, retryDelayMs(attempts - 1)),
        },
        { transaction: t },
      );
    }
  }
}

/**
 * Explicit pipeline: recover stuck charges → create recurring rows → attempt due donations.
 * Uses one transaction per tick so materialization and charging stay consistent per batch.
 */
export async function runDonationProcessingTick(payment: PaymentProvider): Promise<void> {
  const now = new Date();
  await sequelize.transaction(async (t) => {
    await recoverStaleProcessing(t, now);
  });
  await sequelize.transaction(async (t) => {
    await materializeRecurringDonations(t, now);
  });
  await sequelize.transaction(async (t) => {
    await processDueDonations(t, now, payment);
  });
}

export function computeInitialNextScheduledAt(
  frequency: 'weekly' | 'monthly',
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  from: Date = new Date(),
): Date {
  if (frequency === 'weekly') {
    if (dayOfWeek === null || dayOfWeek === undefined) {
      throw new Error('dayOfWeek is required for weekly frequency');
    }
    return firstWeeklyOnOrAfter(from, dayOfWeek);
  }
  if (dayOfMonth === null || dayOfMonth === undefined) {
    throw new Error('dayOfMonth is required for monthly frequency');
  }
  return firstMonthlyOnOrAfter(from, dayOfMonth);
}
