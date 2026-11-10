import type { Request, Response } from 'express';
import { z } from 'zod';
import { UniqueConstraintError } from 'sequelize';
import { Donation, Donor, Product } from '../models';

const registerBody = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(320),
});

const updateBody = z
  .object({
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().max(320).optional(),
  })
  .refine((b) => b.name !== undefined || b.email !== undefined, {
    message: 'At least one of name, email is required',
  });

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

function serializeDonor(d: Donor) {
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const donorController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = listQuery.parse(req.query);
    const rows = await Donor.findAll({
      order: [['createdAt', 'DESC']],
      limit: q.limit,
    });
    res.json({ donors: rows.map(serializeDonor) });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const donor = await Donor.findByPk(id);
    if (!donor) {
      res.status(404).json({ error: 'donor_not_found' });
      return;
    }
    res.json(serializeDonor(donor));
  },

  async register(req: Request, res: Response): Promise<void> {
    const body = registerBody.parse(req.body);
    try {
      const donor = await Donor.create({
        name: body.name,
        email: body.email.toLowerCase(),
      });
      res.status(201).json(serializeDonor(donor));
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        res.status(409).json({ error: 'email_already_registered' });
        return;
      }
      throw e;
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBody.parse(req.body);
    const donor = await Donor.findByPk(id);
    if (!donor) {
      res.status(404).json({ error: 'donor_not_found' });
      return;
    }
    try {
      await donor.update({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email.toLowerCase() } : {}),
      });
      await donor.reload();
      res.json(serializeDonor(donor));
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        res.status(409).json({ error: 'email_already_registered' });
        return;
      }
      throw e;
    }
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const donor = await Donor.findByPk(id);
    if (!donor) {
      res.status(404).json({ error: 'donor_not_found' });
      return;
    }
    await donor.destroy();
    res.status(204).send();
  },

  async listDonations(req: Request, res: Response): Promise<void> {
    const donorId = z.string().uuid().parse(req.params.donorId);
    const donor = await Donor.findByPk(donorId);
    if (!donor) {
      res.status(404).json({ error: 'donor_not_found' });
      return;
    }

    const rows = await Donation.findAll({
      where: { donorId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'code', 'name'] }],
      order: [['scheduledAt', 'DESC']],
    });

    res.json({
      donorId,
      donations: rows.map((d) => ({
        id: d.id,
        product: d.product
          ? { id: d.product.id, code: d.product.code, name: d.product.name }
          : null,
        amountGbp: d.amountGbp,
        donationType: d.donationType,
        status: d.status,
        scheduledAt: d.scheduledAt,
        processedAt: d.processedAt,
        attemptCount: d.attemptCount,
        lastError: d.lastError,
      })),
    });
  },
};
