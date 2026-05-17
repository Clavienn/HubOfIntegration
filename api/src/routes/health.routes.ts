import { Router, Request, Response } from 'express';
import Database from '../config/database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    database: Database.getConnectionStatus(),
  });
});

export default router;