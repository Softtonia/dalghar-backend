import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyPattern?: Record<string, any>;
  keyValue?: Record<string, any>;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Catch custom API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Catch Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Catch Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource identifier format.',
    });
    return;
  }

  // Catch MongoDB duplicate key E11000 errors securely
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'field';
    const duplicateValue = err.keyValue ? err.keyValue[duplicateField] : '';
    res.status(409).json({
      success: false,
      message: `Conflict: A record with this ${duplicateField} ("${duplicateValue}") already exists.`,
    });
    return;
  }

  // Generic internal server error fallback
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack }),
  });
};
