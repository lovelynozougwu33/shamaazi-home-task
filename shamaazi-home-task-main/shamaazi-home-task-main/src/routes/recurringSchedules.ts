import { Router } from 'express';
import { recurringScheduleController } from '../controllers/recurringScheduleController';
import { asyncHandler } from '../http/asyncHandler';

export const recurringSchedulesRouter = Router();

recurringSchedulesRouter.get('/', asyncHandler(recurringScheduleController.list));
recurringSchedulesRouter.post('/', asyncHandler(recurringScheduleController.create));
recurringSchedulesRouter.get('/:id', asyncHandler(recurringScheduleController.getById));
recurringSchedulesRouter.patch('/:id', asyncHandler(recurringScheduleController.update));
recurringSchedulesRouter.delete('/:id', asyncHandler(recurringScheduleController.remove));
