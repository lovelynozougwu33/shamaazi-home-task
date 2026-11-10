import type { Request, Response } from 'express';
import { z } from 'zod';
import { Donor, Product, RecurringSchedule } from '../models';
import { computeInitialNextScheduledAt } from '../services/donationProcessor';

const createBody = z
  .object({
    donorId: z.string().uuid(),
    productId: z.string().uuid(),
    amountGbp: z.number().positive().max(1_000_000),
    frequency: z.enum(['weekly', 'monthly']),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'weekly' && data.dayOfWeek === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dayOfWeek is required when frequency is weekly',
        path: ['dayOfWeek'],
      });
    }
    if (data.frequency === 'monthly' && data.dayOfMonth === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dayOfMonth is required when frequency is monthly',
        path: ['dayOfMonth'],
      });
    }
  });

const updateBody = z
  .object({
    amountGbp: z.number().positive().max(1_000_000).optional(),
    isActive: z.boolean().optional(),
    nextScheduledAt: z.coerce.date().optional(),
    frequency: z.enum(['weekly', 'monthly']).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' });

const listQuery = z.object({
  donorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

function serializeSchedule(s: RecurringSchedule) {
  return {
    id: s.id,
    donorId: s.donorId,
    productId: s.productId,
    amountGbp: s.amountGbp,
    frequency: s.frequency,
    dayOfWeek: s.dayOfWeek,
    dayOfMonth: s.dayOfMonth,
    isActive: s.isActive,
    nextScheduledAt: s.nextScheduledAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const recurringScheduleController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = listQuery.parse(req.query);
    const where = q.donorId ? { donorId: q.donorId } : {};
    const rows = await RecurringSchedule.findAll({
      where,
      order: [['nextScheduledAt', 'ASC']],
      limit: q.limit,
    });
    res.json({ recurringSchedules: rows.map(serializeSchedule) });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const schedule = await RecurringSchedule.findByPk(id);
    if (!schedule) {
      res.status(404).json({ error: 'recurring_schedule_not_found' });
      return;
    }
    res.json(serializeSchedule(schedule));
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = createBody.parse(req.body);
    const [donor, product] = await Promise.all([
      Donor.findByPk(body.donorId),
      Product.findByPk(body.productId),
    ]);
    if (!donor) {
      res.status(400).json({ error: 'donor_not_found' });
      return;
    }
    if (!product) {
      res.status(400).json({ error: 'product_not_found' });
      return;
    }

    const nextScheduledAt = computeInitialNextScheduledAt(
      body.frequency,
      body.frequency === 'weekly' ? body.dayOfWeek! : null,
      body.frequency === 'monthly' ? body.dayOfMonth! : null,
    );

    const schedule = await RecurringSchedule.create({
      donorId: body.donorId,
      productId: body.productId,
      amountGbp: body.amountGbp.toFixed(2),
      frequency: body.frequency,
      dayOfWeek: body.frequency === 'weekly' ? body.dayOfWeek! : null,
      dayOfMonth: body.frequency === 'monthly' ? body.dayOfMonth! : null,
      isActive: true,
      nextScheduledAt,
    });

    res.status(201).json(serializeSchedule(schedule));
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBody.parse(req.body);
    const schedule = await RecurringSchedule.findByPk(id);
    if (!schedule) {
      res.status(404).json({ error: 'recurring_schedule_not_found' });
      return;
    }

    let nextFreq = schedule.frequency;
    let nextDow = schedule.dayOfWeek;
    let nextDom = schedule.dayOfMonth;

    if (body.frequency !== undefined) {
      nextFreq = body.frequency;
      if (body.frequency === 'weekly') {
        nextDow = body.dayOfWeek ?? schedule.dayOfWeek;
        nextDom = null;
        if (nextDow === null || nextDow === undefined) {
          res.status(400).json({ error: 'dayOfWeek_required_for_weekly' });
          return;
        }
      } else {
        nextDom = body.dayOfMonth ?? schedule.dayOfMonth;
        nextDow = null;
        if (nextDom === null || nextDom === undefined) {
          res.status(400).json({ error: 'dayOfMonth_required_for_monthly' });
          return;
        }
      }
    } else {
      if (body.dayOfWeek !== undefined) nextDow = body.dayOfWeek;
      if (body.dayOfMonth !== undefined) nextDom = body.dayOfMonth;
    }

    const scheduleFieldsChanged =
      body.frequency !== undefined || body.dayOfWeek !== undefined || body.dayOfMonth !== undefined;

    let nextScheduledAt = body.nextScheduledAt;
    if (scheduleFieldsChanged && body.nextScheduledAt === undefined) {
      nextScheduledAt = computeInitialNextScheduledAt(
        nextFreq,
        nextFreq === 'weekly' ? nextDow : null,
        nextFreq === 'monthly' ? nextDom : null,
      );
    }

    await schedule.update({
      ...(body.amountGbp !== undefined ? { amountGbp: body.amountGbp.toFixed(2) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(nextScheduledAt !== undefined ? { nextScheduledAt } : {}),
      ...(body.frequency !== undefined ? { frequency: nextFreq } : {}),
      dayOfWeek: nextDow,
      dayOfMonth: nextDom,
    });

    await schedule.reload();
    res.json(serializeSchedule(schedule));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const schedule = await RecurringSchedule.findByPk(id);
    if (!schedule) {
      res.status(404).json({ error: 'recurring_schedule_not_found' });
      return;
    }
    await schedule.destroy();
    res.status(204).send();
  },
};
