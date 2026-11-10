import { Router } from 'express';
import { donationController } from '../controllers/donationController';
import { recurringScheduleController } from '../controllers/recurringScheduleController';
import { asyncHandler } from '../http/asyncHandler';

export const donationsRouter = Router();

donationsRouter.get('/', asyncHandler(donationController.list));
donationsRouter.post('/one-off', asyncHandler(donationController.createOneOff));
donationsRouter.post('/recurring', asyncHandler(recurringScheduleController.create));
donationsRouter.get('/:id', asyncHandler(donationController.getById));
donationsRouter.patch('/:id', asyncHandler(donationController.update));
donationsRouter.delete('/:id', asyncHandler(donationController.remove));
