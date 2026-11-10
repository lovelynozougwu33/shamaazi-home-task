import type { Request, Response } from 'express';
import { z } from 'zod';
import { Donation, Donor, Product } from '../models';

const oneOffBody = z.object({
  donorId: z.string().uuid(),
  productId: z.string().uuid(),
  amountGbp: z.number().positive().max(1_000_000),
  /** If omitted, schedules immediately (same as now). */
  scheduledAt: z.coerce.date().optional(),
});

const updateBody = z.object({
  scheduledAt: z.coerce.date(),
});

const listQuery = z.object({
  donorId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'processing', 'succeeded', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

function serializeDonation(d: Donation) {
  return {
    id: d.id,
    donorId: d.donorId,
    productId: d.productId,
    recurringScheduleId: d.recurringScheduleId,
    donationType: d.donationType,
    amountGbp: d.amountGbp,
    status: d.status,
    scheduledAt: d.scheduledAt,
    processedAt: d.processedAt,
    attemptCount: d.attemptCount,
    lastError: d.lastError,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const donationController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = listQuery.parse(req.query);
    const where: Record<string, unknown> = {};
    if (q.donorId) where.donorId = q.donorId;
    if (q.productId) where.productId = q.productId;
    if (q.status) where.status = q.status;

    const rows = await Donation.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'code', 'name'] }],
      order: [['scheduledAt', 'DESC']],
      limit: q.limit,
    });

    res.json({
      donations: rows.map((d) => ({
        ...serializeDonation(d),
        product: d.product
          ? { id: d.product.id, code: d.product.code, name: d.product.name }
          : null,
      })),
    });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const donation = await Donation.findByPk(id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'code', 'name', 'description'] }],
    });
    if (!donation) {
      res.status(404).json({ error: 'donation_not_found' });
      return;
    }
    res.json({
      ...serializeDonation(donation),
      product: donation.product
        ? {
            id: donation.product.id,
            code: donation.product.code,
            name: donation.product.name,
            description: donation.product.description,
          }
        : null,
    });
  },

  async createOneOff(req: Request, res: Response): Promise<void> {
    const body = oneOffBody.parse(req.body);
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

    const scheduledAt = body.scheduledAt ?? new Date();

    const donation = await Donation.create({
      donorId: body.donorId,
      productId: body.productId,
      recurringScheduleId: null,
      donationType: 'one_off',
      amountGbp: body.amountGbp.toFixed(2),
      status: 'scheduled',
      scheduledAt,
      attemptCount: 0,
      lastError: null,
      processedAt: null,
    });

    res.status(201).json(serializeDonation(donation));
  },

  /**
   * Only `scheduled` donations can be rescheduled (e.g. before the worker picks them up).
   */
  async update(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBody.parse(req.body);
    const donation = await Donation.findByPk(id);
    if (!donation) {
      res.status(404).json({ error: 'donation_not_found' });
      return;
    }
    if (donation.status !== 'scheduled') {
      res.status(409).json({
        error: 'donation_not_editable',
        message: 'Only donations in scheduled state can be updated.',
      });
      return;
    }
    await donation.update({ scheduledAt: body.scheduledAt });
    await donation.reload();
    res.json(serializeDonation(donation));
  },

  /** Removes a donation that has not left the scheduled queue yet. */
  async remove(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const donation = await Donation.findByPk(id);
    if (!donation) {
      res.status(404).json({ error: 'donation_not_found' });
      return;
    }
    if (donation.status !== 'scheduled') {
      res.status(409).json({
        error: 'donation_not_deletable',
        message: 'Only scheduled donations can be deleted.',
      });
      return;
    }
    await donation.destroy();
    res.status(204).send();
  },
};
