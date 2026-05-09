// src/middleware/error.middleware.ts
import { Request, Response } from 'express';
import { ApiError } from '../types';
import logger from '../utils/logger';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
): void => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    const apiError: ApiError = {
      code: err.code,
      message: err.message,
      details: err.details,
      timestamp: new Date(),
      path: req.path,
    };
    res.status(err.statusCode).json(apiError);
    return;
  }

  const apiError: ApiError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date(),
    path: req.path,
  };
  res.status(500).json(apiError);
};