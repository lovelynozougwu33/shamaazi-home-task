import { Router } from 'express';
import { productController } from '../controllers/productController';
import { asyncHandler } from '../http/asyncHandler';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(productController.list));
productsRouter.post('/', asyncHandler(productController.create));
productsRouter.get('/:id', asyncHandler(productController.getById));
productsRouter.patch('/:id', asyncHandler(productController.update));
productsRouter.delete('/:id', asyncHandler(productController.remove));
