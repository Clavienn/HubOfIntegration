// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { SystemModel } from '../models/System';
import { ApiError } from '../types';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  systemId?: string;
  system?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      logger.warn('No API key provided');
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'API key is required',
        timestamp: new Date(),
        path: req.path,
      };
      res.status(401).json(error);
      return;
    }

    logger.debug(`Authenticating with API key: ${apiKey.substring(0, 10)}...`);

    // Chercher le système par apiKey
    const system = await SystemModel.findOne({ apiKey, isActive: true });

    if (!system) {
      logger.warn(`Invalid API key: ${apiKey.substring(0, 10)}...`);
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
        timestamp: new Date(),
        path: req.path,
      };
      res.status(401).json(error);
      return;
    }

    // Stocker l'ID du système (utiliser _id)
    req.systemId = system._id.toString();
    req.system = system;
    
    logger.info(`Authenticated system: ${system.name} (${req.systemId})`);
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