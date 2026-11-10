import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { getOpenApiSpec } from './docs/openapiSpec';
import { healthRouter } from './routes/health';
import { donorsRouter } from './routes/donors';
import { productsRouter } from './routes/products';
import { donationsRouter } from './routes/donations';
import { recurringSchedulesRouter } from './routes/recurringSchedules';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const openApiDocument = getOpenApiSpec();
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Shamaazi API',
      customCss: '.swagger-ui .topbar { display: none }',
    }),
  );

  app.use(healthRouter);
  app.use('/donors', donorsRouter);
  app.use('/products', productsRouter);
  app.use('/donations', donationsRouter);
  app.use('/recurring-schedules', recurringSchedulesRouter);

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'validation_error', details: err.flatten() });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'internal_error' });
    },
  );

  return app;
}
