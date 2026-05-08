// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { IngestRequest } from '../types';
import { AppError } from './error.middleware';

export const validateIngestRequest = (
  req: Request<{}, {}, IngestRequest>,
  res: Response,
  next: NextFunction
): void => {
  const { payload } = req.body;

  if (!payload) {
    throw new AppError('VALIDATION_ERROR', 'Payload is required', 400);
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('VALIDATION_ERROR', 'Payload must be an object', 400);
  }

  if (Object.keys(payload).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Payload cannot be empty', 400);
  }

  next();
};

export const validateSystemConfig = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, webhookUrl, retryPolicy, timeoutMs } = req.body;

  if (!name || typeof name !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'System name is required and must be a string', 400);
  }

  if (webhookUrl && typeof webhookUrl !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Webhook URL must be a string', 400);
  }

  if (retryPolicy) {
    const { maxAttempts, delayMs, backoffMultiplier } = retryPolicy;
    
    if (maxAttempts && (typeof maxAttempts !== 'number' || maxAttempts < 1)) {
      throw new AppError('VALIDATION_ERROR', 'maxAttempts must be a number >= 1', 400);
    }
    
    if (delayMs && (typeof delayMs !== 'number' || delayMs < 0)) {
      throw new AppError('VALIDATION_ERROR', 'delayMs must be a number >= 0', 400);
    }
    
    if (backoffMultiplier && (typeof backoffMultiplier !== 'number' || backoffMultiplier < 1)) {
      throw new AppError('VALIDATION_ERROR', 'backoffMultiplier must be a number >= 1', 400);
    }
  }

  if (timeoutMs && (typeof timeoutMs !== 'number' || timeoutMs < 1000)) {
    throw new AppError('VALIDATION_ERROR', 'timeoutMs must be a number >= 1000', 400);
  }

  next();
};

export const validateRoute = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { sourceSystemId, destinationSystemId, name, condition, priority } = req.body;

  if (!sourceSystemId || typeof sourceSystemId !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'sourceSystemId is required and must be a string', 400);
  }

  if (!destinationSystemId || typeof destinationSystemId !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'destinationSystemId is required and must be a string', 400);
  }

  if (!name || typeof name !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Route name is required and must be a string', 400);
  }

  if (condition && typeof condition !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Condition must be a string', 400);
  }

  if (priority && (typeof priority !== 'number' || priority < 0)) {
    throw new AppError('VALIDATION_ERROR', 'Priority must be a number >= 0', 400);
  }

  next();
};