import type { Request, Response } from 'express';
import { z } from 'zod';
import { UniqueConstraintError } from 'sequelize';
import { Donation, Product } from '../models';

const createBody = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
});

const updateBody = z
  .object({
    code: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.union([z.string().max(4000), z.null()]).optional(),
  })
  .refine((b) => b.code !== undefined || b.name !== undefined || b.description !== undefined, {
    message: 'At least one field is required',
  });

function serializeProduct(p: Product) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const productController = {
  async list(_req: Request, res: Response): Promise<void> {
    const products = await Product.findAll({ order: [['name', 'ASC']] });
    res.json({ products: products.map(serializeProduct) });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'product_not_found' });
      return;
    }
    res.json(serializeProduct(product));
  },

  /** Data-only product creation — no deploy needed for new SKUs. */
  async create(req: Request, res: Response): Promise<void> {
    const body = createBody.parse(req.body);
    try {
      const product = await Product.create({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
      });
      res.status(201).json(serializeProduct(product));
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        res.status(409).json({ error: 'product_code_taken' });
        return;
      }
      throw e;
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBody.parse(req.body);
    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'product_not_found' });
      return;
    }
    try {
      await product.update({
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      });
      await product.reload();
      res.json(serializeProduct(product));
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        res.status(409).json({ error: 'product_code_taken' });
        return;
      }
      throw e;
    }
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = z.string().uuid().parse(req.params.id);
    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ error: 'product_not_found' });
      return;
    }
    const usage = await Donation.count({ where: { productId: id } });
    if (usage > 0) {
      res.status(409).json({
        error: 'product_in_use',
        message: 'Cannot delete a product that has donations. Use a new product code instead.',
      });
      return;
    }
    await product.destroy();
    res.status(204).send();
  },
};
