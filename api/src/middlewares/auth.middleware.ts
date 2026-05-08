// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { SystemModel } from '../models/System';
import { ApiError } from '../types';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  systemId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'API key is required',
        timestamp: new Date(),
        path: req.path,
      };
      res.status(401).json(error);
      return;
    }

    const system = await SystemModel.findOne({ apiKey, isActive: true });

    if (!system) {
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
        timestamp: new Date(),
        path: req.path,
      };
      res.status(401).json(error);
      return;
    }

    req.systemId = system.id;
    logger.debug(`Authenticated system: ${system.name} (${system.id})`);
    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    const apiError: ApiError = {
      code: 'INTERNAL_ERROR',
      message: 'Authentication failed',
      timestamp: new Date(),
      path: req.path,
    };
    res.status(500).json(apiError);
  }
};