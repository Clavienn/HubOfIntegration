import { Express } from 'express';
import healthRouter from './health.routes';
import ingestRouter from './ingest.routes';
import messageRouter from './message.routes';
import systemRouter from './system.routes';
import routeRouter from './route.routes';

const API_PREFIX = '/api/v1';

export function registerRoutes(app: Express): void {
  app.use('/health',                  healthRouter);
  app.use(`${API_PREFIX}/ingest`,     ingestRouter);
  app.use(`${API_PREFIX}/messages`,   messageRouter);
  app.use(`${API_PREFIX}/systems`,    systemRouter);
  app.use(`${API_PREFIX}/routes`,     routeRouter);
}