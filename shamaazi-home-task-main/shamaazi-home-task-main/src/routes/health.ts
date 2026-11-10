import { Router } from 'express';
import { healthController } from '../controllers/healthController';

export const healthRouter = Router();

healthRouter.get('/health', healthController.get);
