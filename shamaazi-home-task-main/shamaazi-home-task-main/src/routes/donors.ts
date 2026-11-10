import { Router } from 'express';
import { donorController } from '../controllers/donorController';
import { asyncHandler } from '../http/asyncHandler';

export const donorsRouter = Router();

donorsRouter.get('/', asyncHandler(donorController.list));
donorsRouter.post('/', asyncHandler(donorController.register));
donorsRouter.get('/:donorId/donations', asyncHandler(donorController.listDonations));
donorsRouter.get('/:id', asyncHandler(donorController.getById));
donorsRouter.patch('/:id', asyncHandler(donorController.update));
donorsRouter.delete('/:id', asyncHandler(donorController.remove));
